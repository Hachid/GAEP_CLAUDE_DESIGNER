'use client'

import { useId } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoriaStat } from '@/app/(app)/dashboard/types'
import { formatMinutos, CAT_COLORS } from '@/app/(app)/dashboard/utils'

type Props = {
  data: CategoriaStat[]
}

const RADIAN = Math.PI / 180
// Não renderiza rótulo em fatias menores que 6%
const MIN_PCT = 0.06
// Semi-arco fixo do caminho de texto (em radianos)
const HALF_SPAN = 0.34

interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index: number
}

function makeLabelRenderer(prefix: string) {
  return function CurvedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: LabelProps) {
    if (percent < MIN_PCT) return null

    const pct = Math.round(percent * 100)
    // Raio no centro da banda do arco
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const svgAngle = -midAngle * RADIAN

    // Dois pontos flanqueando o meio do arco
    const x1 = cx + r * Math.cos(svgAngle - HALF_SPAN)
    const y1 = cy + r * Math.sin(svgAngle - HALF_SPAN)
    const x2 = cx + r * Math.cos(svgAngle + HALF_SPAN)
    const y2 = cy + r * Math.sin(svgAngle + HALF_SPAN)

    // Metade superior (y < cy): vai de x1→x2 sentido anti-horário (sweep=0) → texto L→R
    // Metade inferior (y > cy): vai de x2→x1 sentido horário (sweep=1)   → texto L→R
    const isUpper = midAngle > 0 && midAngle < 180
    const pathD = isUpper
      ? `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`
      : `M ${x2} ${y2} A ${r} ${r} 0 0 1 ${x1} ${y1}`

    const pathId = `${prefix}-${index}`

    return (
      <g>
        <defs>
          <path id={pathId} d={pathD} fill="none" />
        </defs>
        <text
          fill="#999999"
          style={{
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            dominantBaseline: 'auto',
          }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {pct}%
          </textPath>
        </text>
      </g>
    )
  }
}

export function DonutCategoria({ data }: Props) {
  const chartId = useId().replace(/:/g, '')
  const renderLabel = makeLabelRenderer(chartId)

  const chartData = data.map((d) => ({
    name: `${d.nome.charAt(0) + d.nome.slice(1).toLowerCase()}  ${formatMinutos(d.totalMinutos)}`,
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
          labelLine={false}
          label={renderLabel}
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
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
