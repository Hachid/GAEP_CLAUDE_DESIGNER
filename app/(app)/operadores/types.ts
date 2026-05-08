import type { KPIData } from '@/app/(app)/dashboard/types'

export type DesempenhoFiltros = {
  dataInicio: string  // YYYY-MM-DD
  dataFim: string     // YYYY-MM-DD
}

export type FolhaRow = {
  atividade: string
  inicio: string       // "HH:MM"
  fim: string          // "HH:MM"
  totalMinutos: number
  plantao?: boolean
  dataFimFormatada?: string  // "DD/MM" — só presente em plantões multi-dia
}

export type FolhaDia = {
  dataISO: string       // "YYYY-MM-DD" (para ordenação)
  dataFormatada: string // "DD/MM/AAAA"
  rows: FolhaRow[]
  totalMinutos: number
}

export type DesempenhoData = {
  kpi: KPIData
  folha: FolhaDia[]
}
