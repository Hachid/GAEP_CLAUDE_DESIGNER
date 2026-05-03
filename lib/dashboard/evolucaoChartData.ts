import type { EvolucaoMes } from '@/app/(app)/dashboard/types'

/** Chave da série de referência (meta / dias úteis × 7h) nos dados do Recharts. */
export const META_CARGA_MENSAL_KEY = 'cargaHorariaMensal' as const

export type EvolucaoOperadorSerie = {
  id: string
  nome: string
}

/** Converte minutos em horas inteiras para exibição (ex.: 160h). */
export function minutosParaHorasExibicao(minutos: number): number {
  return Math.max(0, Math.round(minutos / 60))
}

/**
 * Operadores presentes no recorte, ordenados por carga total no período (maior primeiro).
 * Mantém no máximo `limite` (padrão 12) para o gráfico permanecer legível.
 */
export function listarOperadoresParaSeries(
  meses: EvolucaoMes[],
  limite = 12
): EvolucaoOperadorSerie[] {
  const totais = new Map<string, { nome: string; totalMin: number }>()
  for (const m of meses) {
    for (const op of m.porOperador) {
      const cur = totais.get(op.id) ?? { nome: op.nome, totalMin: 0 }
      cur.totalMin += op.minutos
      if (op.nome) cur.nome = op.nome
      totais.set(op.id, cur)
    }
  }
  return [...totais.entries()]
    .sort((a, b) => b[1].totalMin - a[1].totalMin)
    .slice(0, limite)
    .map(([id, { nome }]) => ({ id, nome }))
}

export type EvolucaoChartRow = {
  mes: string
  [META_CARGA_MENSAL_KEY]: number
} & Record<string, number | string>

/**
 * Monta uma linha por mês: label no eixo X, meta em horas e uma coluna numérica por id de operador.
 */
export function montarLinhasDoGrafico(
  meses: EvolucaoMes[],
  operadores: EvolucaoOperadorSerie[]
): EvolucaoChartRow[] {
  const ids = new Set(operadores.map((o) => o.id))
  return meses.map((e) => {
    const row: EvolucaoChartRow = {
      mes: e.label,
      [META_CARGA_MENSAL_KEY]: minutosParaHorasExibicao(e.minutosPrevistos),
    }
    for (const id of ids) {
      const op = e.porOperador.find((o) => o.id === id)
      row[id] = op ? minutosParaHorasExibicao(op.minutos) : 0
    }
    return row
  })
}

export function totalOperadoresDistintosNoPeriodo(meses: EvolucaoMes[]): number {
  const s = new Set<string>()
  for (const m of meses) {
    for (const op of m.porOperador) s.add(op.id)
  }
  return s.size
}
