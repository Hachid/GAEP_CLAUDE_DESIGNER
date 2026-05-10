'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionOrThrow } from '@/lib/auth'

export type AuditLogEntry = {
  id: string
  gaep_id: string | null
  operador_id: string | null
  acao: string
  tabela: string | null
  registro_id: string | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  ip: string | null
  created_at: string
  operador_nome: string | null
  gaep_codigo: string | null
}

export type FetchLogsResult = {
  rows: AuditLogEntry[]
  total: number
  error?: string
}

const PAGE_SIZE = 50

export async function fetchAuditLogs(params: {
  page: number
  gaepId?: string
  acao?: string
  tabela?: string
  dataInicio?: string
  dataFim?: string
}): Promise<FetchLogsResult> {
  try {
    const user = await getSessionOrThrow()
    const admin = createAdminClient()

    const { data: op } = await admin
      .from('operadores')
      .select('id, perfil')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!op || op.perfil !== 'SUPER_ADMIN') {
      return { rows: [], total: 0, error: 'Acesso negado.' }
    }

    const from = params.page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = admin
      .from('audit_log')
      .select('*', { count: 'exact' })

    if (params.gaepId) query = query.eq('gaep_id', params.gaepId)
    if (params.acao) query = query.eq('acao', params.acao)
    if (params.tabela) query = query.eq('tabela', params.tabela)
    if (params.dataInicio) query = query.gte('created_at', `${params.dataInicio}T00:00:00`)
    if (params.dataFim) query = query.lte('created_at', `${params.dataFim}T23:59:59`)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (error) return { rows: [], total: 0, error: error.message }

    const rows = data ?? []
    const total = count ?? 0

    const operadorIds = [...new Set(rows.map((r) => r.operador_id).filter(Boolean))] as string[]
    const gaepIds = [...new Set(rows.map((r) => r.gaep_id).filter(Boolean))] as string[]

    const [opsRes, gaepsRes] = await Promise.all([
      operadorIds.length > 0
        ? admin.from('operadores').select('id, nome').in('id', operadorIds)
        : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      gaepIds.length > 0
        ? admin.from('gaeps').select('id, codigo').in('id', gaepIds)
        : Promise.resolve({ data: [] as { id: string; codigo: string }[] }),
    ])

    const opMap = new Map((opsRes.data ?? []).map((o) => [o.id, o.nome]))
    const gaepMap = new Map((gaepsRes.data ?? []).map((g) => [g.id, g.codigo]))

    const enriched: AuditLogEntry[] = rows.map((r) => ({
      id: String(r.id),
      gaep_id: r.gaep_id ?? null,
      operador_id: r.operador_id ?? null,
      acao: String(r.acao),
      tabela: r.tabela ?? null,
      registro_id: r.registro_id ?? null,
      dados_antes: (r.dados_antes as Record<string, unknown> | null) ?? null,
      dados_depois: (r.dados_depois as Record<string, unknown> | null) ?? null,
      ip: r.ip ?? null,
      created_at: String(r.created_at),
      operador_nome: r.operador_id ? (opMap.get(r.operador_id) ?? null) : null,
      gaep_codigo: r.gaep_id ? (gaepMap.get(r.gaep_id) ?? null) : null,
    }))

    return { rows: enriched, total }
  } catch {
    return { rows: [], total: 0, error: 'Erro ao buscar logs.' }
  }
}

export async function fetchGaepsParaFiltro(): Promise<{ id: string; codigo: string }[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gaeps')
      .select('id, codigo')
      .is('deleted_at', null)
      .order('codigo')
    return (data ?? []).map((g) => ({ id: String(g.id), codigo: String(g.codigo) }))
  } catch {
    return []
  }
}

export async function fetchTabelasDistintas(): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('audit_log')
      .select('tabela')
      .not('tabela', 'is', null)
      .order('tabela')
    const tabelas = [...new Set((data ?? []).map((r) => String(r.tabela)).filter(Boolean))]
    return tabelas
  } catch {
    return []
  }
}
