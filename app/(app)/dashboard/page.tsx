export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { DashboardClient } from './DashboardClient'
import { fetchKPIData, fetchEvolucao } from './actions'
import type { DashboardFiltros } from './types'

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

  // ── 3. Período padrão: mês atual ─────────────────────────────
  const now = new Date()
  const ano = now.getFullYear()
  const mes = now.getMonth() + 1
  const filtrosIniciais: DashboardFiltros = {
    dataInicio: `${ano}-${String(mes).padStart(2, '0')}-01`,
    dataFim: new Date(ano, mes, 0).toISOString().slice(0, 10),
    categoriaId: '',
    atividadeId: '',
  }

  // ── 4. Busca dados em paralelo ────────────────────────────────
  const [catRes, atRes, kpiInicial, evolucaoInicial] = await Promise.all([
    admin.from('categorias_atividade').select('id, nome').order('nome'),
    admin
      .from('atividades')
      .select('id, nome, categoria_id')
      .is('deleted_at', null)
      .order('nome'),
    fetchKPIData(gaep.id, filtrosIniciais),
    fetchEvolucao(gaep.id),
  ])

  const categorias = (catRes.data ?? []) as { id: string; nome: string }[]
  const atividades = (atRes.data ?? []) as { id: string; nome: string; categoria_id: string }[]

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
          />
        </div>
      </main>
    </>
  )
}
