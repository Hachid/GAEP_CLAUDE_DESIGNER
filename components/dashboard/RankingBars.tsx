'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import type { AtividadeStat } from '@/app/(app)/dashboard/types'
import { formatMinutos, CAT_COLORS, CAT_ORDER } from '@/app/(app)/dashboard/utils'

type Props = {
  data: AtividadeStat[]
}

function CategoriaBarChart({
  items,
  color,
}: {
  items: AtividadeStat[]
  color: string
}) {
  const chartData = items.map((d) => ({
    name: d.nome,
    value: Math.round(d.totalMinutos / 60 * 10) / 10,
    label: formatMinutos(d.totalMinutos),
  }))

  const barHeight = Math.max(160, items.length * 44)

  return (
    <ResponsiveContainer width="100%" height={barHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
      >
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [
            typeof value === 'number' ? `${value}h` : String(value),
            'Horas',
          ]}
          contentStyle={{ fontSize: '0.82rem', fontWeight: 700 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={color} />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            fontSize={11}
            fontWeight={700}
            fill="#475569"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RankingBars({ data }: Props) {
  const categorias = CAT_ORDER.filter((cat) => data.some((d) => d.categoriaNome === cat))

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 120,
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
      {categorias.map((cat, idx) => {
        const items = data.filter((d) => d.categoriaNome === cat)
        const color = CAT_COLORS[cat] ?? '#94a3b8'
        return (
          <div key={cat} style={{ marginTop: idx > 0 ? 24 : 0 }}>
            <div
              style={{
                textAlign: 'center',
                fontWeight: 700,
                color,
                fontSize: '0.9rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 8,
                marginBottom: 12,
              }}
            >
              Ranking: {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </div>
            <CategoriaBarChart items={items} color={color} />
          </div>
        )
      })}
    </div>
  )
}
