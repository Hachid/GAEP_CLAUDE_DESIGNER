'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EvolucaoMes } from '@/app/(app)/dashboard/types'
import {
  META_CARGA_MENSAL_KEY,
  listarOperadoresParaSeries,
  montarLinhasDoGrafico,
  totalOperadoresDistintosNoPeriodo,
} from '@/lib/dashboard/evolucaoChartData'

type PeriodoId = 'dias30' | 'dias60' | 'trimestral' | 'semestral' | 'anual' | 'total'

const PERIODOS: { id: PeriodoId; label: string; meses: number | null; dias: number | null }[] = [
  { id: 'dias30', label: '30 dias', meses: null, dias: 30 },
  { id: 'dias60', label: '60 dias', meses: null, dias: 60 },
  { id: 'trimestral', label: 'Trimestral', meses: 3, dias: null },
  { id: 'semestral', label: 'Semestral', meses: 6, dias: null },
  { id: 'anual', label: 'Anual', meses: 12, dias: null },
  { id: 'total', label: 'Todo Período', meses: null, dias: null },
]

function parseMesInicio(mes: string): Date {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, (m ?? 1) - 1, 1)
}

function parseMesFim(mes: string): Date {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m ?? 1, 0, 23, 59, 59, 999)
}

function filtrarMesesPorDias(evolucao: EvolucaoMes[], dias: number): EvolucaoMes[] {
  const fim = new Date()
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - (dias - 1))

  return evolucao.filter((item) => {
    const mesInicio = parseMesInicio(item.mes)
    const mesFim = parseMesFim(item.mes)
    return mesFim >= inicio && mesInicio <= fim
  })
}

/** Paleta equilibrada (12 operadores + contraste com a meta institucional). */
const OP_STROKES = [
  '#0d9488',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
  '#a16207',
  '#4338ca',
  '#0f766e',
  '#9f1239',
  '#166534',
  '#64748b',
] as const

const META_STROKE = '#1a237e'
const META_FILL = '#1a237e'

type TooltipEntry = {
  dataKey?: string | number
  name?: string
  value?: number | string
  color?: string
}

function formatHoras(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n)}h`
}

function EvolucaoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const byKey = new Map<string, TooltipEntry>()
  for (const p of payload) {
    const k = String(p.dataKey ?? '')
    const cur = byKey.get(k)
    if (!cur) {
      byKey.set(k, p)
      continue
    }
    const prefer =
      Boolean(p.name && !cur.name) || (String(p.name ?? '').length > String(cur.name ?? '').length) ? p : cur
    byKey.set(k, prefer)
  }
  const deduped = [...byKey.values()]
  const visiveis = deduped.filter((item) => {
    const key = String(item.dataKey ?? '')
    if (key === META_CARGA_MENSAL_KEY) return true
    const n = typeof item.value === 'number' ? item.value : Number(item.value)
    return Number.isFinite(n) && n > 0
  })

  const sorted = [...visiveis].sort((a, b) => {
    const ak = String(a.dataKey ?? '')
    const bk = String(b.dataKey ?? '')
    if (ak === META_CARGA_MENSAL_KEY) return -1
    if (bk === META_CARGA_MENSAL_KEY) return 1
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR')
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-2 border-b border-slate-100 pb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-0.5 text-sm">
        {sorted.map((item, i) => {
          const key = String(item.dataKey ?? item.name ?? i)
          const isMeta = key === META_CARGA_MENSAL_KEY
          return (
            <li key={key} className="flex items-center justify-between gap-6">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: item.color,
                    border: isMeta ? `1px solid ${META_STROKE}` : undefined,
                  }}
                />
                <span className="truncate font-medium text-slate-800">
                  {isMeta ? 'Carga horária mensal' : (item.name ?? key)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatHoras(item.value)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type Props = {
  evolucao: EvolucaoMes[]
}

export function EvolucaoLinhas({ evolucao }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoId>('semestral')

  const periodoConfig = PERIODOS.find((p) => p.id === periodo)!
  const sliced = useMemo(
    () =>
      periodoConfig.dias
        ? filtrarMesesPorDias(evolucao, periodoConfig.dias)
        : periodoConfig.meses === null
          ? evolucao
          : evolucao.slice(-periodoConfig.meses),
    [evolucao, periodoConfig.dias, periodoConfig.meses]
  )

  const operadores = useMemo(() => listarOperadoresParaSeries(sliced, 12), [sliced])
  const chartData = useMemo(() => montarLinhasDoGrafico(sliced, operadores), [sliced, operadores])
  const semDados = chartData.length === 0
  const temSeriesOperador = operadores.length > 0
  const totalOpsDistintos = useMemo(() => totalOperadoresDistintosNoPeriodo(sliced), [sliced])
  const houveCorteOperadores = totalOpsDistintos > operadores.length
  return (
    <div className="rounded-xl border border-gaep-border bg-white p-4 shadow-sm sm:p-5 md:p-6">
      <div className="mb-1 text-center">
        <h2 className="text-base font-bold tracking-tight text-gaep-text md:text-lg">Evolução de Horas por Mês</h2>
        <p className="mt-1 text-xs text-gaep-muted md:text-sm">Comparativo entre meta mensal e operadores</p>
      </div>

      <div className="mb-4 mt-4 flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodo(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-3.5 sm:text-[0.8rem] ${
              periodo === p.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 text-gaep-muted hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {houveCorteOperadores && !semDados && (
        <p className="mb-3 text-center text-[0.7rem] leading-snug text-amber-800 sm:text-xs">
          Exibindo os {operadores.length} operadores com maior carga no período ({totalOpsDistintos} no total). Use a
          legenda para focar linhas.
        </p>
      )}

      {semDados ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-gaep-muted md:h-[320px]">
          Sem dados no período
        </div>
      ) : (
        <>
          <div className="h-[280px] w-full min-w-0 md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="evolucaoMetaArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={META_FILL} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={META_FILL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v)}h`}
                  width={44}
                />
                <Tooltip
                  content={<EvolucaoTooltip />}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  wrapperStyle={{ pointerEvents: 'auto' }}
                />
                <Area
                  type="monotone"
                  dataKey={META_CARGA_MENSAL_KEY}
                  stroke="none"
                  fill="url(#evolucaoMetaArea)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={META_CARGA_MENSAL_KEY}
                  name="Carga horária mensal"
                  stroke={META_STROKE}
                  strokeWidth={2.75}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: META_STROKE }}
                  isAnimationActive={false}
                />
                {operadores.map((op, idx) => (
                  <Line
                    key={op.id}
                    type="monotone"
                    dataKey={op.id}
                    name={op.nome}
                    stroke={OP_STROKES[idx % OP_STROKES.length]}
                    strokeWidth={1.35}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#fff' }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {!temSeriesOperador && (
            <p className="mt-2 text-center text-xs text-gaep-muted">
              Ainda não há carga horária individual registrada para este período.
            </p>
          )}
        </>
      )}
    </div>
  )
}
