'use client'

import { formatMinutos } from '@/app/(app)/dashboard/utils'
import type { OperadorStat } from '@/app/(app)/dashboard/types'

const RANK_COLOR: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#b45309' }

export function RankingOperadores({ data }: { data: OperadorStat[] }) {
  if (data.length === 0) return null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '18px 16px',
        marginBottom: 20,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontWeight: 700,
          color: '#1e293b',
          fontSize: '0.95rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        Ranking por Operador
      </div>

      {data.slice(0, 10).map((op, idx) => {
        const rank = idx + 1
        const accent = RANK_COLOR[rank] ?? '#1a237e'
        const numerica = op.numerica?.trim() || ''

        return (
          <div
            key={op.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: rank < data.slice(0, 10).length ? 14 : 0,
            }}
          >
            {/* Rank / medalha */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: rank <= 3 ? `${accent}20` : '#f1f5f9',
                color: rank <= 3 ? accent : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: rank <= 3 ? '0.9rem' : '0.72rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {rank}
            </div>

            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: rank <= 3 ? `${accent}18` : 'rgba(26,35,126,0.07)',
                color: rank <= 3 ? accent : '#1a237e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {numerica}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}
                >
                  {op.nome}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: rank <= 3 ? accent : '#1a237e' }}>
                    {formatMinutos(op.totalMinutos)}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {op.totalRegistros} reg.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
