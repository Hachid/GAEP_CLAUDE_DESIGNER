'use client'

import type { ReactElement } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoriaStat } from '@/app/(app)/dashboard/types'
import { formatMinutos, CAT_COLORS } from '@/app/(app)/dashboard/utils'

type Props = {
  data: CategoriaStat[]
  /** Visual rosca grossa + % internos + legenda manual (somente Dashboard). */
  dashboardLayout?: boolean
}

type ThickSlice = {
  nomeLabel: string
  value: number
  color: string
  horasLabel: string
}

type InnerLabelProps = {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}

/** Rosca grossa: valores em px no sistema do gráfico (ResponsiveContainer). */
const THICK_INNER_RADIUS = 55
const THICK_OUTER_RADIUS = 92

function tituloCategoria(nome: string): string {
  return nome.charAt(0) + nome.slice(1).toLowerCase()
}

function renderLabelInterno(props: InnerLabelProps): ReactElement | null {
  const cx = props.cx
  const cy = props.cy
  const midAngle = props.midAngle
  const innerRadius = props.innerRadius
  const outerRadius = props.outerRadius
  const percent = props.percent
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof midAngle !== 'number' ||
    typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof percent !== 'number'
  ) {
    return null
  }
  if (percent < 0.05) return null

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={800}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

export function DonutCategoria({ data, dashboardLayout = false }: Props) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '0.85rem',
        }}
      >
        Sem dados no período
      </div>
    )
  }

  if (dashboardLayout) {
    const chartData: ThickSlice[] = data.map((d) => ({
      nomeLabel: tituloCategoria(d.nome),
      value: d.totalMinutos,
      color: CAT_COLORS[d.nome] ?? '#94a3b8',
      horasLabel: formatMinutos(d.totalMinutos),
    }))

    return (
      <div>
        <ResponsiveContainer width="100%" height={230}>
          <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="nomeLabel"
              cx="50%"
              cy="50%"
              innerRadius={THICK_INNER_RADIUS}
              outerRadius={THICK_OUTER_RADIUS}
              paddingAngle={1}
              stroke="#ffffff"
              strokeWidth={1}
              label={renderLabelInterno}
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.nomeLabel} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                formatMinutos(typeof value === 'number' ? value : 0),
                'Horas',
              ]}
              contentStyle={{ fontSize: '0.82rem', fontWeight: 700 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {chartData.map((item) => (
            <div
              key={item.nomeLabel}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span>{item.nomeLabel}</span>
              <span>{item.horasLabel}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: `${tituloCategoria(d.nome)}  ${formatMinutos(d.totalMinutos)}`,
    value: d.totalMinutos,
    color: CAT_COLORS[d.nome] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          cx="50%"
          cy="42%"
          innerRadius="58%"
          outerRadius="78%"
          paddingAngle={3}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={3} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [
            formatMinutos(typeof value === 'number' ? value : 0),
            'Horas',
          ]}
          contentStyle={{ fontSize: '0.82rem', fontWeight: 700 }}
        />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value: string) => (
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
