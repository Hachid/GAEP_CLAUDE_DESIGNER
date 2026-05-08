'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoriaStat } from '@/app/(app)/dashboard/types'
import { formatMinutos, CAT_COLORS } from '@/app/(app)/dashboard/utils'

type Props = {
  data: CategoriaStat[]
}

const RADIAN = Math.PI / 180
const MIN_PCT = 0.05

interface LabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) {
  if (
    cx == null || cy == null || midAngle == null ||
    innerRadius == null || outerRadius == null || percent == null ||
    percent < MIN_PCT
  ) return null

  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: '16px', fontWeight: 800, pointerEvents: 'none' }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

export function DonutCategoria({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.nome.charAt(0) + d.nome.slice(1).toLowerCase(),
    horas: formatMinutos(d.totalMinutos),
    value: d.totalMinutos,
    color: CAT_COLORS[d.nome] ?? '#94a3b8',
  }))

  if (chartData.length === 0) {
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

  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={92}
            paddingAngle={1}
            labelLine={false}
            label={renderLabel}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
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

      {/* Legenda horizontal centralizada */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '4px 14px',
          marginTop: 6,
        }}
      >
        {chartData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: d.color,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
              {d.name} {d.horas}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
