export const MES_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

export function toMesLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MES_LABELS[m] ?? m}/${y.slice(2)}`
}

export function minutesBetween(inicio: string, fim: string): number {
  const [hi, mi] = inicio.slice(0, 5).split(':').map(Number)
  const [hf, mf] = fim.slice(0, 5).split(':').map(Number)
  let mins = hf * 60 + mf - (hi * 60 + mi)
  if (mins < 0) mins += 24 * 60
  return mins
}

export function formatMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}h`
}

export const CAT_COLORS: Record<string, string> = {
  OPERAR: '#1a237e',
  TREINAR: '#f97316',
  INSTRUIR: '#16a34a',
}

export const CAT_ORDER = ['TREINAR', 'OPERAR', 'INSTRUIR'] as const
