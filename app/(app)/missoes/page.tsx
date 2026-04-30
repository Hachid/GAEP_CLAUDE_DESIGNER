export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { MissoesClient } from './MissoesClient'
import type { MissaoRow, OperadorOption, TipoMissaoOption } from './MissoesClient'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  numerica: string | null
  matricula?: string
  gaep_id: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

export default async function MissoesPage() {
  // ── 1. Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const admin = createAdminClient()

  async function buscarOperadorAtualPorAuthId(authId: string) {
    const withNumerica = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, numerica, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
      .eq('auth_id', authId)
      .is('deleted_at', null)
      .maybeSingle<OperadorComGaep>()

    if (!withNumerica.error) return withNumerica.data

    const fallback = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
      .eq('auth_id', authId)
      .is('deleted_at', null)
      .maybeSingle<Omit<OperadorComGaep, 'numerica'>>()

    if (!fallback.data) return null
    return { ...fallback.data, numerica: null }
  }

  async function buscarOperadorAtualPorMatricula(matricula: string) {
    const withNumerica = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, numerica, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
      .eq('matricula', matricula)
      .is('deleted_at', null)
      .maybeSingle<OperadorComGaep>()

    if (!withNumerica.error) return withNumerica.data

    const fallback = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
      .eq('matricula', matricula)
      .is('deleted_at', null)
      .maybeSingle<Omit<OperadorComGaep, 'numerica'>>()

    if (!fallback.data) return null
    return { ...fallback.data, numerica: null }
  }

  async function listarOperadoresGaep(gaepId: string) {
    const withNumerica = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, numerica, matricula')
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome')

    if (!withNumerica.error) {
      return (withNumerica.data ?? []) as Array<{
        id: string
        nome_guerra: string
        numerica: string | null
        matricula: string | null
      }>
    }

    const fallback = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, matricula')
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome')

    return ((fallback.data ?? []) as Array<{ id: string; nome_guerra: string; matricula: string | null }>).map((o) => ({
      ...o,
      numerica: null,
    }))
  }

  // ── 2. Lookup operador ────────────────────────────────────────
  let operadorAtual: OperadorComGaep | null = null

  const byAuthId = await buscarOperadorAtualPorAuthId(user.id)

  if (byAuthId) {
    operadorAtual = byAuthId
  } else {
    const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''
    if (matricula) {
      const byMat = await buscarOperadorAtualPorMatricula(matricula)
      if (byMat) {
        operadorAtual = byMat
        admin.from('operadores').update({ auth_id: user.id }).eq('id', byMat.id).then(() => {})
      }
    }
  }

  if (!operadorAtual) redirect('/relatorio')
  const gaep = operadorAtual.gaeps
  if (!gaep) redirect('/relatorio')

  // ── 3. Dados em paralelo ──────────────────────────────────────
  const [opsData, tiposRes, missoesRes] = await Promise.all([
    listarOperadoresGaep(gaep.id),
    admin
      .from('tipos_missao')
      .select('id, tipo, valor')
      .order('tipo'),

    admin
      .from('missoes')
      .select(
        `id, operador_id, tipo_missao_id, tipo_snapshot, qtd,
         valor_unitario_snapshot, valor_total, observacao, created_at,
         operadores!missoes_operador_id_fkey(id, nome_guerra:nome)`
      )
      .eq('gaep_id', gaep.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  // ── 4. Montar props ───────────────────────────────────────────
  const operadores: OperadorOption[] = opsData.map((o) => ({
    id: o.id,
    nome: o.nome_guerra,
    numerica: o.numerica ?? null,
  }))

  const tiposMissao: TipoMissaoOption[] = ((tiposRes.data ?? []) as Array<{ id: string; tipo: string; valor: number }>).map((t) => ({
    id: t.id,
    tipo: t.tipo,
    valor: Number(t.valor),
  }))

  type MissaoRaw = {
    id: string
    operador_id: string
    tipo_missao_id: string
    tipo_snapshot: string
    qtd: number
    valor_unitario_snapshot: number
    valor_total: number
    observacao: string | null
    created_at: string
    operadores: { id: string; nome_guerra: string } | null
  }

  const missoes: MissaoRow[] = ((missoesRes.data ?? []) as MissaoRaw[]).map((m) => ({
    id: m.id,
    operadorId: m.operador_id,
    operadorNome: m.operadores?.nome_guerra ?? '—',
    tipoMissaoId: m.tipo_missao_id,
    tipoSnapshot: m.tipo_snapshot,
    qtd: Number(m.qtd),
    valorUnitarioSnapshot: Number(m.valor_unitario_snapshot),
    valorTotal: Number(m.valor_total),
    observacao: m.observacao,
    createdAt: m.created_at,
  }))

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
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
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
            MISSÕES / DIÁRIAS
          </div>
          <MissoesClient
            operadores={operadores}
            tiposMissao={tiposMissao}
            missoes={missoes}
            operadorAtualId={operadorAtual.id}
          />
        </div>
      </main>
    </>
  )
}
