'use client'

import { DonutCategoria } from '@/components/dashboard/DonutCategoria'
import { RankingBars } from '@/components/dashboard/RankingBars'
import { formatMinutos } from '@/app/(app)/dashboard/utils'
import type { KPIData } from '@/app/(app)/dashboard/types'

type Props = {
  kpi: KPIData
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e2e8f0',
}

const cardTitleStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 700,
  color: '#1e293b',
  fontSize: '0.95rem',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 10,
  marginBottom: 14,
}

export function GraficosOperador({ kpi }: Props) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            marginBottom: 0,
            borderTop: '4px solid #1a237e',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            Missões no Período
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: 6 }}>
            {kpi.totalRegistros}
          </div>
        </div>
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            marginBottom: 0,
            borderTop: '4px solid #f97316',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            Carga Horária
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', marginTop: 6 }}>
            {formatMinutos(kpi.totalMinutos)}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardTitleStyle}>Composição por Categoria</div>
        <DonutCategoria data={kpi.porCategoria} />
      </div>

      <div style={cardStyle}>
        <RankingBars data={kpi.rankingAtividades} />
      </div>
    </>
  )
}
