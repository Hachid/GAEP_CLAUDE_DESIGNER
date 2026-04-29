'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { EvolucaoMes } from '@/app/(app)/dashboard/types'

type PeriodoId = 'trimestral' | 'semestral' | 'anual' | 'total'

const PERIODOS: { id: PeriodoId; label: string; meses: number | null }[] = [
  { id: 'trimestral', label: 'Trimestral', meses: 3 },
  { id: 'semestral', label: 'Semestral', meses: 6 },
  { id: 'anual', label: 'Anual', meses: 12 },
  { id: 'total', label: 'Todo Período', meses: null },
]

type Props = {
  evolucao: EvolucaoMes[]
}

export function EvolucaoLinhas({ evolucao }: Props) {
  const [mounted, setMounted] = useState(false)
  const [periodo, setPeriodo] = useState<PeriodoId>('semestral')
  useEffect(() => setMounted(true), [])

  const periodoConfig = PERIODOS.find((p) => p.id === periodo)!
  const sliced =
    periodoConfig.meses === null
      ? evolucao
      : evolucao.slice(-periodoConfig.meses)

  const chartData = sliced.map((e) => ({
    mes: e.label,
    horas: Math.round((e.minutos / 60) * 10) / 10,
    registros: e.registros,
  }))

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 18,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontWeight: 800,
          color: '#1e293b',
          fontSize: '0.95rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        Evolução de Horas por Mês
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 18,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            style={{
              padding: '7px 13px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.75rem',
              transition: '0.2s',
              background: periodo === p.id ? '#1a237e' : '#f1f5f9',
              color: periodo === p.id ? '#fff' : '#64748b',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!mounted ? (
        <div style={{ height: 260 }} />
      ) : chartData.length === 0 ? (
        <div
          style={{
            height: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '0.85rem',
          }}
        >
          Sem dados no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}h`}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === 'number' ? `${value}h` : String(value),
                'Horas',
              ]}
              labelStyle={{ fontWeight: 700, color: '#1e293b' }}
              contentStyle={{ fontSize: '0.82rem' }}
            />
            <Line
              type="monotone"
              dataKey="horas"
              stroke="#1a237e"
              strokeWidth={3}
              dot={{ r: 5, fill: '#1a237e', strokeWidth: 0 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
