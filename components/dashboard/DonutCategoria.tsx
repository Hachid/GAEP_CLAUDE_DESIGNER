'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { CategoriaStat } from '@/app/(app)/dashboard/types'
import { formatMinutos, CAT_COLORS } from '@/app/(app)/dashboard/utils'

type Props = {
  data: CategoriaStat[]
}

export function DonutCategoria({ data }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const chartData = data.map((d) => ({
    name: `${d.nome.charAt(0) + d.nome.slice(1).toLowerCase()}  ${formatMinutos(d.totalMinutos)}`,
    value: d.totalMinutos,
    color: CAT_COLORS[d.nome] ?? '#94a3b8',
    rawNome: d.nome,
  }))

  if (!mounted) return <div style={{ height: 240 }} />

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
