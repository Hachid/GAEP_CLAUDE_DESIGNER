'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { minutesBetween, toMesLabel } from './utils'
import type {
  KPIData,
  DashboardFiltros,
  CategoriaStat,
  AtividadeStat,
  OperadorStat,
  EvolucaoMes,
} from './types'

type RelRow = {
  id: string
  hora_inicio: string
  hora_fim: string
  atividade_id: string
  relatorista_id: string | null
  atividades: { id: string; nome: string } | { id: string; nome: string }[] | null
  categorias_atividade: { id: string; nome: string } | { id: string; nome: string }[] | null
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function computeKPI(gaepId: string, filtros: DashboardFiltros): Promise<KPIData> {
  const admin = createAdminClient()

  let baseQuery = admin
    .from('relatorios')
    .select(
      `id, hora_inicio, hora_fim, atividade_id, relatorista_id,
       atividades!inner(id, nome),
       categorias_atividade(id, nome)`
    )
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .gte('data', filtros.dataInicio)
    .lte('data', filtros.dataFim)

  if (filtros.categoriaId) baseQuery = baseQuery.eq('categoria_id', filtros.categoriaId) as typeof baseQuery
  if (filtros.atividadeId) baseQuery = baseQuery.eq('atividade_id', filtros.atividadeId) as typeof baseQuery

  const { data } = await baseQuery

  const rows = (data ?? []) as RelRow[]

  const catMap = new Map<string, CategoriaStat>()
  const atMap = new Map<string, AtividadeStat>()
  const opMinsMap = new Map<string, number>()
  const opCntMap = new Map<string, number>()
  let totalMinutos = 0

  for (const r of rows) {
    const at = pickFirst(r.atividades)
    if (!at) continue
    const cat = pickFirst(r.categorias_atividade)
    if (!cat) continue
    const mins = minutesBetween(r.hora_inicio, r.hora_fim)

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

    if (r.relatorista_id) {
      opMinsMap.set(r.relatorista_id, (opMinsMap.get(r.relatorista_id) ?? 0) + mins)
      opCntMap.set(r.relatorista_id, (opCntMap.get(r.relatorista_id) ?? 0) + 1)
    }
  }

  // Resolve nomes dos operadores em batch
  const opIds = [...opMinsMap.keys()]
  let opRows: Array<{ id: string; nome: string; numerica: string | null }> = []
  if (opIds.length > 0) {
    const withNumerica = await admin.from('operadores').select('id, nome, numerica').in('id', opIds)
    if (!withNumerica.error) {
      opRows = (withNumerica.data ?? []) as Array<{ id: string; nome: string; numerica: string | null }>
    } else {
      const fallback = await admin.from('operadores').select('id, nome, matricula').in('id', opIds)
      opRows = ((fallback.data ?? []) as Array<{ id: string; nome: string; matricula: string | null }>).map(
        (o) => ({
          id: o.id,
          nome: o.nome,
          numerica: null,
        })
      )
    }
  }
  const opMap = Object.fromEntries(
    opRows.map((o) => [
      o.id,
      o,
    ])
  )

  const rankingOperadores: OperadorStat[] = opIds
    .map((id) => ({
      id,
      nome: opMap[id]?.nome ?? '—',
      numerica: opMap[id]?.numerica ?? null,
      totalMinutos: opMinsMap.get(id) ?? 0,
      totalRegistros: opCntMap.get(id) ?? 0,
    }))
    .sort((a, b) => b.totalMinutos - a.totalMinutos)

  return {
    totalRegistros: rows.length,
    totalMinutos,
    porCategoria: [...catMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
    rankingAtividades: [...atMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
    rankingOperadores,
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
  data: string
  hora_inicio: string
  hora_fim: string
}

// Fetches full monthly evolution (all history, no date filter)
export async function fetchEvolucao(gaepId: string): Promise<EvolucaoMes[]> {
  const admin = createAdminClient()

  const dataMinima = new Date()
  dataMinima.setMonth(dataMinima.getMonth() - 11)
  dataMinima.setDate(1)
  const dataCorte = dataMinima.toISOString().slice(0, 10)

  const { data } = await admin
    .from('relatorios')
    .select('data, hora_inicio, hora_fim')
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .gte('data', dataCorte)
    .order('data')

  const rows = (data ?? []) as EvoRow[]
  const mesMap = new Map<string, { minutos: number; registros: number }>()

  for (const r of rows) {
    const mes = r.data.slice(0, 7)
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
