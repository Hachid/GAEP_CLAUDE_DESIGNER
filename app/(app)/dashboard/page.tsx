export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { DashboardClient } from './DashboardClient'
import { fetchKPIData, fetchEvolucao } from './actions'
import { resolveAnaliseGaepIds, gaepIdsToCacheKey } from './gaepScope'
import type { DashboardFiltros } from './types'
import { getCategorias, getAtividades } from '@/lib/cache/queries'
import { logAudit } from '@/lib/audit'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

export default async function DashboardPage() {
  // ── 1. Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const admin = createAdminClient()

  // ── 2. Lookup do operador ─────────────────────────────────────
  let operadorAtual: OperadorComGaep | null = null

  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (byAuthId) {
    operadorAtual = byAuthId
  } else {
    const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''
    if (matricula) {
      const { data: byMatricula } = await admin
        .from('operadores')
        .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
        .eq('matricula', matricula)
        .is('deleted_at', null)
        .maybeSingle<OperadorComGaep>()
      if (byMatricula) {
        operadorAtual = byMatricula
        admin.from('operadores').update({ auth_id: user.id }).eq('id', byMatricula.id).then(() => {})
      }
    }
  }

  if (!operadorAtual) redirect('/relatorio')

  const gaep = operadorAtual.gaeps
  if (!gaep) redirect('/relatorio')

  const escopoIdsInicial = await resolveAnaliseGaepIds(
    admin,
    String(operadorAtual.perfil ?? 'OPERADOR'),
    gaep.id,
    undefined
  )
  const escopoKeyInicial = gaepIdsToCacheKey(escopoIdsInicial)

  let listaGaepsAnalise: { id: string; codigo: string }[] = []
  if (operadorAtual.perfil === 'SUPER_ADMIN') {
    const { data: gRows } = await admin
      .from('gaeps')
      .select('id, codigo')
      .is('deleted_at', null)
      .order('codigo')
    listaGaepsAnalise = (gRows ?? []).map((g: { id: string; codigo: string }) => ({
      id: String(g.id),
      codigo: String(g.codigo),
    }))
  }

  // ── 3. Período padrão: último mês com dados (fallback: mês atual) ──
  const now = new Date()
  let baseDate = now
  const { data: ultimoRelatorio } = await admin
    .from('relatorios')
    .select('data')
    .eq('gaep_id', gaep.id)
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle<{ data: string }>()

  if (ultimoRelatorio?.data) {
    const parsed = new Date(`${ultimoRelatorio.data}T12:00:00`)
    if (!Number.isNaN(parsed.getTime())) baseDate = parsed
  }

  const ano = baseDate.getFullYear()
  const mes = baseDate.getMonth() + 1
  const filtrosIniciais: DashboardFiltros = {
    dataInicio: `${ano}-${String(mes).padStart(2, '0')}-01`,
    dataFim: new Date(ano, mes, 0).toISOString().slice(0, 10),
    categoriaId: '',
    atividadeId: '',
  }

  // ── 4. Busca dados em paralelo (categorias/atividades via cache) ──
  const [categorias, atividades, kpiInicial, evolucaoInicial, diasUteisRes] = await Promise.all([
    getCategorias(),
    getAtividades(),
    fetchKPIData(escopoKeyInicial, filtrosIniciais),
    fetchEvolucao(escopoKeyInicial),
    admin
      .from('gaep_dias_uteis')
      .select('referencia_mes, dias_uteis')
      .eq('gaep_id', gaep.id)
      .order('referencia_mes', { ascending: false }),
  ])

  const diasUteisMesInicial = (diasUteisRes.data ?? []).map((r) => ({
    referenciaMes: String(r.referencia_mes),
    diasUteis: Number(r.dias_uteis),
  }))

  logAudit({
    gaepId: gaep.id,
    operadorId: operadorAtual.id,
    acao: 'ACESSO',
    tabela: 'dashboard',
    dadosDepois: {
      tela: '/dashboard',
      perfil: operadorAtual.perfil ?? 'OPERADOR',
    },
  }).catch(() => {})

  // ── 5. Render ─────────────────────────────────────────────────
  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={gaep.nome}
        perfil={operadorAtual.perfil ?? 'OPERADOR'}
      />
      <main
        style={{
          minHeight: '100vh',
          background: '#f3f4f6',
          padding: '74px 16px 20px',
        }}
      >
        <div style={{ maxWidth: 430, margin: '0 auto' }}>
          <div
            style={{
              textAlign: 'center',
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#1a237e',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: 14,
              marginBottom: 22,
              letterSpacing: 0.3,
            }}
          >
            INTELIGÊNCIA OPERACIONAL
          </div>
          <DashboardClient
            kpiInicial={kpiInicial}
            evolucaoInicial={evolucaoInicial}
            filtrosIniciais={filtrosIniciais}
            categorias={categorias}
            atividades={atividades}
            diasUteisMesInicial={diasUteisMesInicial}
            isSuperAdmin={operadorAtual.perfil === 'SUPER_ADMIN'}
            listaGaepsAnalise={listaGaepsAnalise}
            gaepCodigoContexto={gaep.nome}
          />
        </div>
      </main>
    </>
  )
}
