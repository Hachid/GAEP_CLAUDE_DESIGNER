import { HORAS_EXPEDIENTE_DIA } from './constants'

export function cargaHorariaTotalHoras(diasUteis: number): number {
  const d = Math.max(0, Math.round(Number(diasUteis) || 0))
  return d * HORAS_EXPEDIENTE_DIA
}

export function cargaHorariaTotalMinutos(diasUteis: number): number {
  return Math.round(cargaHorariaTotalHoras(diasUteis) * 60)
}
