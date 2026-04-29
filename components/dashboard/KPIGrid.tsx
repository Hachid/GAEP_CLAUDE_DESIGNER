import type { KPIData } from '@/app/(app)/dashboard/types'
import { formatMinutos } from '@/app/(app)/dashboard/utils'

const CAT_ORDER = ['OPERAR', 'TREINAR', 'INSTRUIR'] as const
const CAT_COLORS: Record<string, string> = {
  OPERAR: '#1a237e',
  TREINAR: '#f97316',
  INSTRUIR: '#16a34a',
}

type Props = {
  kpi: KPIData
}

export function KPIGrid({ kpi }: Props) {
  return (
    <>
      {/* 2 cards grandes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 12px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #1a237e',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.66rem',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 700,
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Total de Registros
          </div>
          <div
            style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              color: '#1e293b',
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {kpi.totalRegistros}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '18px 12px',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #1e293b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.66rem',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 700,
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Carga Horária
          </div>
          <div
            style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              color: '#1e293b',
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {formatMinutos(kpi.totalMinutos)}
          </div>
        </div>
      </div>

      {/* 3 cards por categoria */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}
      >
        {CAT_ORDER.map((nome) => {
          const stat = kpi.porCategoria.find((c) => c.nome === nome)
          const color = CAT_COLORS[nome] ?? '#94a3b8'
          return (
            <div
              key={nome}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '14px 6px',
                border: '1px solid #e2e8f0',
                borderTop: `3px solid ${color}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {nome.charAt(0) + nome.slice(1).toLowerCase()}
              </div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color,
                }}
              >
                {stat ? formatMinutos(stat.totalMinutos) : '00:00h'}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
