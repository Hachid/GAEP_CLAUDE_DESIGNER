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

export type EvolucaoMes = {
  mes: string   // "2026-04"
  label: string // "Abr/26"
  minutos: number
  registros: number
}

export type KPIData = {
  totalRegistros: number
  totalMinutos: number
  porCategoria: CategoriaStat[]
  rankingAtividades: AtividadeStat[]
}

export type DashboardFiltros = {
  dataInicio: string  // YYYY-MM-DD
  dataFim: string     // YYYY-MM-DD
  categoriaId: string // '' = todas
  atividadeId: string // '' = todas
}
