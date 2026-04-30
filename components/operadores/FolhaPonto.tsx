'use client'

import React from 'react'
import { formatMinutos } from '@/app/(app)/dashboard/utils'
import type { FolhaDia } from '@/app/(app)/operadores/types'

type Props = {
  dias: FolhaDia[]
  totalMinutos: number
  totalRegistros: number
  cargaHorariaPrevistaMinutos?: number
  saldoMinutos?: number
}

export function FolhaPonto({ dias, totalMinutos, totalRegistros, cargaHorariaPrevistaMinutos, saldoMinutos }: Props) {
  const saldoCor = (saldoMinutos ?? 0) >= 0 ? '#16a34a' : '#ef4444'
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 18,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
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
            {totalRegistros}
          </div>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 18,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
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
            {formatMinutos(totalMinutos)}
          </div>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 18,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            borderTop: `4px solid ${saldoCor}`,
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
            Saldo do Mês
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: saldoCor, marginTop: 6 }}>
            {saldoMinutos === undefined ? '—' : `${saldoMinutos >= 0 ? '+' : ''}${formatMinutos(Math.abs(saldoMinutos))}`}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.68rem', color: '#94a3b8' }}>
            Previsto: {cargaHorariaPrevistaMinutos === undefined ? '—' : formatMinutos(cargaHorariaPrevistaMinutos)}
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            fontSize: '0.75rem',
            textAlign: 'center',
            marginBottom: 16,
            letterSpacing: 0.5,
          }}
        >
          Quadro de Horários (Folha Ponto)
        </div>

        {dias.length === 0 ? (
          <div
            style={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '0.85rem',
            }}
          >
            Sem registros no período
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #e2e8f0',
                  color: '#64748b',
                  textAlign: 'center',
                }}
              >
                <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>Data</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>
                  Atividade
                </th>
                <th style={{ padding: '8px 4px', fontWeight: 700 }}>Início</th>
                <th style={{ padding: '8px 4px', fontWeight: 700 }}>Fim</th>
                <th style={{ padding: '8px 4px', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((dia, di) => (
                <React.Fragment key={dia.dataISO}>
                  {dia.rows.map((r, ri) => (
                    <tr key={`${di}-${ri}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td
                        style={{
                          padding: '7px 4px',
                          color: '#1a237e',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          fontSize: '0.8rem',
                        }}
                      >
                        {ri === 0 ? dia.dataFormatada : ''}
                      </td>
                      <td
                        style={{
                          padding: '7px 4px',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.79rem',
                        }}
                      >
                        {r.atividade}
                      </td>
                      <td style={{ padding: '7px 4px', textAlign: 'center', color: '#475569' }}>
                        {r.inicio}
                      </td>
                      <td style={{ padding: '7px 4px', textAlign: 'center', color: '#475569' }}>
                        {r.fim}
                      </td>
                      <td
                        style={{
                          padding: '7px 4px',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#475569',
                        }}
                      >
                        {formatMinutos(r.totalMinutos)}
                      </td>
                    </tr>
                  ))}

                  <tr style={{ background: 'rgba(249,115,22,0.06)' }} key={`subtotal-${di}`}>
                    <td
                      colSpan={4}
                      style={{
                        padding: '6px 4px 6px 8px',
                        textAlign: 'right',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: 0.3,
                      }}
                    >
                      TOTAL DO DIA:
                    </td>
                    <td
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        color: '#f97316',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                      }}
                    >
                      {formatMinutos(dia.totalMinutos)}
                    </td>
                  </tr>

                  {di < dias.length - 1 && (
                    <tr>
                      <td colSpan={5} style={{ height: 6 }} />
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: '2px solid #1a237e',
                  fontWeight: 700,
                  color: '#1a237e',
                  background: 'rgba(26,35,126,0.04)',
                }}
              >
                <td
                  colSpan={4}
                  style={{ padding: '12px 4px 12px 8px', textAlign: 'right', fontSize: '0.9rem' }}
                >
                  TOTAL GERAL:
                </td>
                <td
                  style={{ padding: '12px 4px', textAlign: 'center', fontSize: '1rem' }}
                >
                  {formatMinutos(totalMinutos)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  )
}
