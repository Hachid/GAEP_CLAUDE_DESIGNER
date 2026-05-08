'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionOrThrow } from '@/lib/auth'
import { minutesBetween, toMesLabel } from './utils'
import type {
  KPIData,
  DashboardFiltros,
  CategoriaStat,
  AtividadeStat,
  OperadorStat,
  EvolucaoMes,
  RelatorioLinhaConsolidado,
} from './types'

type RelRow = {
  id: string
  data: string
  hora_inicio: string
  hora_fim: string
  plantao: boolean | null
  data_fim: string | null
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
      `id, data, hora_inicio, hora_fim, plantao, data_fim, atividade_id, relatorista_id,
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
    const isPlantao = (r.plantao ?? false) && !!r.data_fim && r.data_fim > r.data
    const mins = isPlantao
      ? Math.round((new Date(`${r.data_fim}T${r.hora_fim}`).getTime() - new Date(`${r.data}T${r.hora_inicio}`).getTime()) / 60000)
      : minutesBetween(r.hora_inicio, r.hora_fim)

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

// Called from page.tsx (server) — gaepId already resolved.
// Cache de 60 s por (gaepId × filtros). Invalidado via revalidateTag('relatorios-kpi')
// quando um relatório é salvo, editado ou excluído.
export const fetchKPIData = unstable_cache(
  computeKPI,
  ['kpi-dashboard'],
  { revalidate: 60, tags: ['relatorios-kpi'] }
)

// Called from DashboardClient (client) — resolves gaepId from auth
export async function refreshKPIData(
  filtros: DashboardFiltros
): Promise<{ data: KPIData | null; error: string | null }> {
  try {
    const user = await getSessionOrThrow().catch(() => null)
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

type PartRow = {
  operador_id: string
  hora_inicio: string | null
  hora_fim: string | null
}

type RelComPartsRow = {
  data: string
  hora_inicio: string
  hora_fim: string
  plantao: boolean | null
  data_fim: string | null
  relatorista_id: string | null
  relatorio_participantes: PartRow[]
}

// Cache de 60 s por gaepId. Mesma tag de invalidação do KPI.
export const fetchEvolucao = unstable_cache(
  _fetchEvolucaoRaw,
  ['evolucao-dashboard'],
  { revalidate: 60, tags: ['relatorios-kpi'] }
)

async function _fetchEvolucaoRaw(gaepId: string): Promise<EvolucaoMes[]> {
  const admin = createAdminClient()

  const hoje = new Date()
  const dataMaxima = hoje.toISOString().slice(0, 10)
  const mesAtual = dataMaxima.slice(0, 7) // "YYYY-MM"
  const dataMinima = new Date(hoje)
  dataMinima.setMonth(dataMinima.getMonth() - 11)
  dataMinima.setDate(1)
  const dataCorte = dataMinima.toISOString().slice(0, 10)
  const mesCorte = dataCorte.slice(0, 7) // "YYYY-MM"

  // Busca relatórios (com participantes) e dias úteis em paralelo
  const [relRes, diasRes] = await Promise.all([
    admin
      .from('relatorios')
      .select('data, hora_inicio, hora_fim, plantao, data_fim, relatorista_id, relatorio_participantes(operador_id, hora_inicio, hora_fim)')
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)
      .gte('data', dataCorte)
      .lte('data', dataMaxima)
      .order('data'),
    admin
      .from('gaep_dias_uteis')
      .select('referencia_mes, dias_uteis')
      .eq('gaep_id', gaepId)
      .gte('referencia_mes', mesCorte)
      .lte('referencia_mes', mesAtual),
  ])

  const rows = (relRes.data ?? []) as RelComPartsRow[]

  // Mapa mês → minutos previstos (dias_uteis × 7h × 60min)
  const MINS_POR_DIA = 7 * 60
  const previstosMap = new Map<string, number>()
  for (const d of ((diasRes.data ?? []) as Array<{ referencia_mes: string; dias_uteis: number }>)) {
    previstosMap.set(d.referencia_mes, d.dias_uteis * MINS_POR_DIA)
  }

  // Agrupa por mês — horas reais por participante
  const mesMap = new Map<string, {
    minutos: number
    registros: number
    opMins: Map<string, number>
  }>()

  for (const rel of rows) {
    const mes = rel.data.slice(0, 7)

    let entry = mesMap.get(mes)
    if (!entry) {
      entry = { minutos: 0, registros: 0, opMins: new Map() }
      mesMap.set(mes, entry)
    }
    entry.registros++

    const parts = rel.relatorio_participantes ?? []

    const isPlantaoRel = (rel.plantao ?? false) && !!rel.data_fim && rel.data_fim > rel.data

    if (parts.length > 0) {
      for (const p of parts) {
        const inicio = p.hora_inicio ?? rel.hora_inicio
        const fim = p.hora_fim ?? rel.hora_fim
        const mins = isPlantaoRel
          ? Math.round((new Date(`${rel.data_fim}T${fim}`).getTime() - new Date(`${rel.data}T${inicio}`).getTime()) / 60000)
          : minutesBetween(inicio, fim)
        entry.minutos += mins
        entry.opMins.set(p.operador_id, (entry.opMins.get(p.operador_id) ?? 0) + mins)
      }
    } else if (rel.relatorista_id) {
      const mins = isPlantaoRel
        ? Math.round((new Date(`${rel.data_fim}T${rel.hora_fim}`).getTime() - new Date(`${rel.data}T${rel.hora_inicio}`).getTime()) / 60000)
        : minutesBetween(rel.hora_inicio, rel.hora_fim)
      entry.minutos += mins
      entry.opMins.set(rel.relatorista_id, (entry.opMins.get(rel.relatorista_id) ?? 0) + mins)
    }
  }

  // Garante que meses com dias_uteis configurados apareçam mesmo sem relatórios
  for (const mes of previstosMap.keys()) {
    if (!mesMap.has(mes)) {
      mesMap.set(mes, { minutos: 0, registros: 0, opMins: new Map() })
    }
  }

  // Coleta todos os IDs de operadores para busca em batch
  const allOpIds = new Set<string>()
  for (const entry of mesMap.values()) {
    for (const id of entry.opMins.keys()) allOpIds.add(id)
  }

  let opNameMap: Record<string, string> = {}
  if (allOpIds.size > 0) {
    const { data: opData } = await admin
      .from('operadores')
      .select('id, nome')
      .in('id', [...allOpIds])
    if (opData) {
      opNameMap = Object.fromEntries(
        (opData as Array<{ id: string; nome: string }>).map((o) => [o.id, o.nome])
      )
    }
  }

  return [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, { minutos, registros, opMins }]) => ({
      mes,
      label: toMesLabel(mes),
      minutos,
      minutosPrevistos: previstosMap.get(mes) ?? 0,
      registros,
      porOperador: [...opMins.entries()].map(([id, min]) => ({
        id,
        nome: opNameMap[id] ?? id,
        minutos: min,
      })),
    }))
}

/**
 * Relatórios no período/filtros para corpo do PDF consolidado (só servidor, após auth na rota).
 */
export async function fetchRelatoriosParaConsolidadoPdf(
  gaepId: string,
  filtros: DashboardFiltros
): Promise<RelatorioLinhaConsolidado[]> {
  await getSessionOrThrow()
  const admin = createAdminClient()

  let q = admin
    .from('relatorios')
    .select(
      `id, data, descricao_revisada, fotos_urls, relatorista_id,
       atividades(id, nome),
       categorias_atividade(id, nome)`
    )
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .gte('data', filtros.dataInicio)
    .lte('data', filtros.dataFim)
    .order('data', { ascending: true })

  if (filtros.categoriaId) q = q.eq('categoria_id', filtros.categoriaId) as typeof q
  if (filtros.atividadeId) q = q.eq('atividade_id', filtros.atividadeId) as typeof q

  const { data, error } = await q
  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[consolidadoPdf] fetch relatorios:', error?.message)
    }
    return []
  }

  type Row = {
    id: string
    data: string
    descricao_revisada: string
    fotos_urls: unknown
    relatorista_id: string | null
    atividades: { id: string; nome: string } | { id: string; nome: string }[] | null
    categorias_atividade: { id: string; nome: string } | { id: string; nome: string }[] | null
  }

  const rows = data as Row[]
  const relIds = [...new Set(rows.map((r) => r.relatorista_id).filter(Boolean))] as string[]
  let nomeMap: Record<string, string> = {}
  if (relIds.length > 0) {
    const { data: ops } = await admin.from('operadores').select('id, nome').in('id', relIds)
    nomeMap = Object.fromEntries(((ops ?? []) as Array<{ id: string; nome: string }>).map((o) => [o.id, o.nome]))
  }

  return rows.map((r) => {
    const cat = pickFirst(r.categorias_atividade)
    const at = pickFirst(r.atividades)
    return {
      id: r.id,
      data: r.data,
      descricao_revisada: r.descricao_revisada ?? '',
      fotos_urls: r.fotos_urls,
      categoriaNome: cat?.nome ?? null,
      atividadeNome: at?.nome ?? null,
      relatoristaNome: r.relatorista_id ? (nomeMap[r.relatorista_id] ?? null) : null,
    }
  })
}
