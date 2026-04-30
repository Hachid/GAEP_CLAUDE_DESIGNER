'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { minutesBetween } from '@/app/(app)/dashboard/utils'
import type { KPIData, CategoriaStat, AtividadeStat } from '@/app/(app)/dashboard/types'
import type { DesempenhoFiltros, DesempenhoData, FolhaDia, FolhaRow } from './types'

type RelRow = {
  id: string
  data: string
  hora_inicio: string | null
  hora_fim: string | null
  atividades: { id: string; nome: string } | null
  categorias_atividade: { id: string; nome: string } | null
}

async function fetchRelatoriosOperador(
  operadorId: string,
  filtros: DesempenhoFiltros
): Promise<RelRow[]> {
  const admin = createAdminClient()

  const { data: parts } = await admin
    .from('relatorio_participantes')
    .select('relatorio_id')
    .eq('operador_id', operadorId)

  if (!parts || parts.length === 0) return []

  const relIds = (parts as { relatorio_id: string }[]).map((p) => p.relatorio_id)

  const { data } = await admin
    .from('relatorios')
    .select(
      `id, data, hora_inicio, hora_fim,
       atividades!inner(id, nome),
       categorias_atividade(id, nome)`
    )
    .in('id', relIds)
    .gte('data', filtros.dataInicio)
    .lte('data', filtros.dataFim)
    .is('deleted_at', null)
    .order('data')
    .order('hora_inicio')

  return (data ?? []) as unknown as RelRow[]
}

function extrairMesRef(dataISO: string): string {
  return dataISO.slice(0, 7)
}

function minutosCargaPorDiasUteis(diasUteis: number): number {
  return Math.max(0, Math.round(diasUteis) * 7 * 60)
}

export async function fetchDesempenhoData(
  operadorId: string,
  filtros: DesempenhoFiltros
): Promise<{ data: DesempenhoData | null; error: string | null }> {
  try {
    const admin = createAdminClient()
    const { data: operador } = await admin
      .from('operadores')
      .select('gaep_id')
      .eq('id', operadorId)
      .maybeSingle()
    if (!operador?.gaep_id) {
      return { data: null, error: 'Operador não encontrado para cálculo de carga horária.' }
    }

    const rows = await fetchRelatoriosOperador(operadorId, filtros)

    const catMap = new Map<string, CategoriaStat>()
    const atMap = new Map<string, AtividadeStat>()
    const diaMap = new Map<string, { rows: FolhaRow[]; totalMinutos: number }>()
    let totalMinutos = 0

    for (const r of rows) {
      if (!r.atividades || !r.categorias_atividade || !r.hora_inicio || !r.hora_fim) continue
      const mins = minutesBetween(r.hora_inicio, r.hora_fim)
      const cat = r.categorias_atividade
      const at = r.atividades

      totalMinutos += mins

      // KPI aggregation
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

      // Folha ponto aggregation
      const folhaRow: FolhaRow = {
        atividade: at.nome,
        inicio: r.hora_inicio.slice(0, 5),
        fim: r.hora_fim.slice(0, 5),
        totalMinutos: mins,
      }
      const existing = diaMap.get(r.data)
      if (existing) {
        existing.rows.push(folhaRow)
        existing.totalMinutos += mins
      } else {
        diaMap.set(r.data, { rows: [folhaRow], totalMinutos: mins })
      }
    }

    const kpi: KPIData = {
      totalRegistros: rows.length,
      totalMinutos,
      cargaHorariaPrevistaMinutos: 0,
      saldoMinutos: totalMinutos,
      porCategoria: [...catMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
      rankingAtividades: [...atMap.values()].sort((a, b) => b.totalMinutos - a.totalMinutos),
      rankingOperadores: [],
    }

    // Para período mensal, usa os dias úteis cadastrados manualmente para o mês.
    if (filtros.dataInicio.slice(0, 7) === filtros.dataFim.slice(0, 7)) {
      const referenciaMes = extrairMesRef(filtros.dataInicio)
      const { data: diasUteisCfg } = await admin
        .from('gaep_dias_uteis')
        .select('dias_uteis')
        .eq('gaep_id', String(operador.gaep_id))
        .eq('referencia_mes', referenciaMes)
        .maybeSingle()

      if (typeof diasUteisCfg?.dias_uteis === 'number') {
        const cargaHorariaPrevistaMinutos = minutosCargaPorDiasUteis(diasUteisCfg.dias_uteis)
        kpi.cargaHorariaPrevistaMinutos = cargaHorariaPrevistaMinutos
        kpi.saldoMinutos = totalMinutos - cargaHorariaPrevistaMinutos
      }
    }

    const folha: FolhaDia[] = [...diaMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dataISO, { rows: folhaRows, totalMinutos: totalDia }]) => {
        const [y, m, d] = dataISO.split('-')
        return {
          dataISO,
          dataFormatada: `${d}/${m}/${y}`,
          rows: folhaRows,
          totalMinutos: totalDia,
        }
      })

    return { data: { kpi, folha }, error: null }
  } catch (err) {
    console.error('[fetchDesempenhoData]', err)
    return { data: null, error: 'Erro ao buscar dados' }
  }
}
