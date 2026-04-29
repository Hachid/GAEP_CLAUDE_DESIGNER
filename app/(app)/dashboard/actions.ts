'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { minutesBetween, toMesLabel } from './utils'
import type {
  KPIData,
  DashboardFiltros,
  CategoriaStat,
  AtividadeStat,
  EvolucaoMes,
} from './types'

type RelRow = {
  id: string
  hora_inicio: string
  hora_fim: string
  atividade_id: string
  atividades: {
    id: string
    nome: string
    categoria_id: string
    categorias_atividade: { id: string; nome: string }
  } | null
}

async function computeKPI(gaepId: string, filtros: DashboardFiltros): Promise<KPIData> {
  const admin = createAdminClient()

  // Resolve atividade_ids when filtering by category or specific activity
  let atividadeIds: string[] | null = null
  if (filtros.atividadeId) {
    atividadeIds = [filtros.atividadeId]
  } else if (filtros.categoriaId) {
    const { data: ats } = await admin
      .from('atividades')
      .select('id')
      .eq('categoria_id', filtros.categoriaId)
      .is('deleted_at', null)
    atividadeIds = (ats ?? []).map((a: { id: string }) => a.id)
    if (atividadeIds.length === 0) {
      return { totalRegistros: 0, totalMinutos: 0, porCategoria: [], rankingAtividades: [] }
    }
  }

  const baseQuery = admin
    .from('relatorios')
    .select(
      `id, hora_inicio, hora_fim, atividade_id,
       atividades!inner(id, nome, categoria_id, categorias_atividade!inner(id, nome))`
    )
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .gte('data_atividade', filtros.dataInicio)
    .lte('data_atividade', filtros.dataFim)

  const { data } = atividadeIds
    ? await baseQuery.in('atividade_id', atividadeIds)
    : await baseQuery

  const rows = (data ?? []) as RelRow[]

  const catMap = new Map<string, CategoriaStat>()
  const atMap = new Map<string, AtividadeStat>()
  let totalMinutos = 0

  for (const r of rows) {
    if (!r.atividades) continue
    const mins = minutesBetween(r.hora_inicio, r.hora_fim)
    const cat = r.atividades.categorias_atividade
    const at = r.atividades

    totalMinutos += mins

    const ec = catMap.get(cat.id)
    if (ec) {
      ec.totalRegistros++
      ec.totalMinutos += mins
    } else {
      catMap.set(cat.id, { id: cat.id, nome: cat.nome, totalRegistros: 1, totalMinutos: mins })
    }

    const ea = atMap.get(at.id)
    if (ea) {
      ea.totalRegistros++
      ea.totalMinutos += mins
    } else {
      atMap.set(at.id, {
        id: at.id,
        nome: at.nome,
        categoriaId: cat.id,
        categoriaNome: cat.nome,
        totalRegistros: 1,
        totalMinutos: mins,
      })
    }
  }

  return {
    totalRegistros: rows.length,
    totalMinutos,
    porCategoria: [...catMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
    rankingAtividades: [...atMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
  }
}

// Called from page.tsx (server) — gaepId already resolved
export async function fetchKPIData(gaepId: string, filtros: DashboardFiltros): Promise<KPIData> {
  return computeKPI(gaepId, filtros)
}

// Called from DashboardClient (client) — resolves gaepId from auth
export async function refreshKPIData(
  filtros: DashboardFiltros
): Promise<{ data: KPIData | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Não autenticado' }

    const admin = createAdminClient()
    const { data: op } = await admin
      .from('operadores')
      .select('gaep_id')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .maybeSingle<{ gaep_id: string }>()

    if (!op?.gaep_id) return { data: null, error: 'Operador não encontrado' }

    const data = await computeKPI(op.gaep_id, filtros)
    return { data, error: null }
  } catch (err) {
    console.error('[refreshKPIData]', err)
    return { data: null, error: 'Erro ao buscar dados' }
  }
}

type EvoRow = {
  data_atividade: string
  hora_inicio: string
  hora_fim: string
}

// Fetches full monthly evolution (all history, no date filter)
export async function fetchEvolucao(gaepId: string): Promise<EvolucaoMes[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('relatorios')
    .select('data_atividade, hora_inicio, hora_fim')
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .order('data_atividade')

  const rows = (data ?? []) as EvoRow[]
  const mesMap = new Map<string, { minutos: number; registros: number }>()

  for (const r of rows) {
    const mes = r.data_atividade.slice(0, 7)
    const mins = minutesBetween(r.hora_inicio, r.hora_fim)
    const existing = mesMap.get(mes)
    if (existing) {
      existing.minutos += mins
      existing.registros++
    } else {
      mesMap.set(mes, { minutos: mins, registros: 1 })
    }
  }

  return [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, { minutos, registros }]) => ({
      mes,
      label: toMesLabel(mes),
      minutos,
      registros,
    }))
}
