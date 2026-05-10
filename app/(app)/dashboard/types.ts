export type CategoriaStat = {
  id: string
  nome: string
  totalRegistros: number
  totalMinutos: number
}

export type AtividadeStat = {
  id: string
  nome: string
  categoriaId: string
  categoriaNome: string
  totalRegistros: number
  totalMinutos: number
}

export type EvolucaoOperador = {
  id: string
  nome: string
  minutos: number
}

export type EvolucaoMes = {
  mes: string           // "2026-04"
  label: string         // "Abr/26"
  minutos: number       // soma das horas trabalhadas (todos os participantes)
  minutosPrevistos: number  // dias_uteis × 7h × 60 (de gaep_dias_uteis)
  registros: number
  porOperador: EvolucaoOperador[]
}

export type OperadorStat = {
  id: string
  nome: string
  numerica: string | null
  totalRegistros: number
  totalMinutos: number
}

export type KPIData = {
  totalRegistros: number
  totalMinutos: number
  cargaHorariaPrevistaMinutos?: number
  saldoMinutos?: number
  porCategoria: CategoriaStat[]
  rankingAtividades: AtividadeStat[]
  rankingOperadores: OperadorStat[]
}

/** Valor de `analiseGaepId` para consolidar todos os GAEPs (somente SUPER_ADMIN). */
export const DASHBOARD_ANALISE_TODOS_GAEPS = '__ALL__' as const

export type DashboardFiltros = {
  dataInicio: string  // YYYY-MM-DD
  dataFim: string     // YYYY-MM-DD
  categoriaId: string // '' = todas
  atividadeId: string // '' = todas
  /** SUPER_ADMIN: omitir = GAEP do cadastro do operador; id UUID = outro GAEP; `DASHBOARD_ANALISE_TODOS_GAEPS` = todos. */
  analiseGaepId?: string
}

/** Linha de relatório para PDF consolidado (texto + metadados + fotos). */
export type RelatorioLinhaConsolidado = {
  id: string
  data: string
  descricao_revisada: string
  ocorrencias: string | null
  fotos_urls: unknown
  categoriaNome: string | null
  atividadeNome: string | null
  relatoristaNome: string | null
}
