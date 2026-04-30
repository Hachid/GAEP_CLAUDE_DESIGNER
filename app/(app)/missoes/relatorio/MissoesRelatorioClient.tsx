'use client'

import { useEffect } from 'react'

type ConfigRelatorio = {
  tituloTexto: string
  subtituloTexto: string
  rodapeTexto: string
  timbradoUrl: string | null
  printMargins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

type MissaoDetalhe = {
  id: string
  data: string
  tipo: string
  qtd: number
  valorUnitario: number
  valorTotal: number
  observacao: string | null
}

type OperadorResumo = {
  operadorId: string
  operadorNome: string
  operadorNumerica: string | null
  totalMisssoes: number
  totalValor: number
  missoes: MissaoDetalhe[]
}

interface Props {
  gaepCodigo: string
  geradoEm: string
  ultimaAtualizacao: string | null
  configRelatorio: ConfigRelatorio
  operadores: OperadorResumo[]
  autoPrintPdf?: boolean
}

function fmtMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDataHora(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

function fmtData(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function renderRodape(texto: string, gaepCodigo: string) {
  return texto.replaceAll('{{GAEP}}', gaepCodigo).replaceAll('{{VERSAO}}', 'Missões')
}

export function MissoesRelatorioClient({
  gaepCodigo,
  geradoEm,
  ultimaAtualizacao,
  configRelatorio,
  operadores,
  autoPrintPdf = false,
}: Props) {
  useEffect(() => {
    if (!autoPrintPdf) return
    const id = window.setTimeout(() => window.print(), 500)
    return () => window.clearTimeout(id)
  }, [autoPrintPdf])

  return (
    <div style={{ paddingBottom: 30 }}>
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: '1.05rem', color: '#1a237e' }}>Relatório de Missões</h1>
          <button
            onClick={() => window.print()}
            style={{ padding: '9px 12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            🖨 PDF
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16, color: '#475569', fontSize: '0.82rem' }}>
          <div><strong>Gerado em:</strong> {fmtDataHora(geradoEm)}</div>
          <div><strong>Última atualização:</strong> {fmtDataHora(ultimaAtualizacao)}</div>
          <div><strong>Ordenação:</strong> menor para maior total de missões</div>
        </div>
      </div>

      <div
        className="print-page"
      >
        <div
          className="print-page-bg"
          style={configRelatorio.timbradoUrl ? { backgroundImage: `url(${configRelatorio.timbradoUrl})` } : undefined}
        />
        <div
          className="print-page-content"
          style={{
            top: `${configRelatorio.printMargins.top}mm`,
            right: `${configRelatorio.printMargins.right}mm`,
            bottom: `${configRelatorio.printMargins.bottom}mm`,
            left: `${configRelatorio.printMargins.left}mm`,
          }}
        >
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12pt', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2mm', whiteSpace: 'pre-line' }}>
            {configRelatorio.tituloTexto || 'RELATÓRIO DE MISSÕES'}
          </div>
          <div style={{ textAlign: 'center', fontSize: '11pt', borderBottom: '1px solid #333', paddingBottom: '2mm', marginBottom: '3mm' }}>
            {configRelatorio.subtituloTexto || 'RELATÓRIO CONSOLIDADO DE MISSÕES'}
          </div>
          <div style={{ fontSize: '9pt', marginBottom: '4mm' }}>
            GAEP: {gaepCodigo} | Gerado em: {fmtDataHora(geradoEm)} | Última atualização: {fmtDataHora(ultimaAtualizacao)}
          </div>

          {operadores.map((op) => (
            <div key={op.operadorId} style={{ marginBottom: '5mm', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '10pt', fontWeight: 700, color: '#111827', marginBottom: '1.5mm' }}>
                {op.operadorNome} {op.operadorNumerica ? `· Num. ${op.operadorNumerica}` : ''}
              </div>
              <div style={{ fontSize: '9pt', marginBottom: '2mm' }}>
                {op.totalMisssoes} {op.totalMisssoes === 1 ? 'Missão Registrada' : 'Missões Registradas'} · Total {fmtMoeda(op.totalValor)}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #666', textAlign: 'left', padding: '1.2mm' }}>Data</th>
                    <th style={{ borderBottom: '1px solid #666', textAlign: 'left', padding: '1.2mm' }}>Tipo</th>
                    <th style={{ borderBottom: '1px solid #666', textAlign: 'right', padding: '1.2mm' }}>Qtd.</th>
                    <th style={{ borderBottom: '1px solid #666', textAlign: 'right', padding: '1.2mm' }}>Vlr Unit.</th>
                    <th style={{ borderBottom: '1px solid #666', textAlign: 'right', padding: '1.2mm' }}>Vlr Total</th>
                  </tr>
                </thead>
                <tbody>
                  {op.missoes.map((m) => (
                    <tr key={m.id}>
                      <td style={{ borderBottom: '1px solid #ddd', padding: '1.2mm' }}>{fmtData(m.data)}</td>
                      <td style={{ borderBottom: '1px solid #ddd', padding: '1.2mm' }}>
                        {m.tipo}
                        {m.observacao ? ` — ${m.observacao}` : ''}
                      </td>
                      <td style={{ borderBottom: '1px solid #ddd', padding: '1.2mm', textAlign: 'right' }}>{m.qtd.toString().replace('.', ',')}</td>
                      <td style={{ borderBottom: '1px solid #ddd', padding: '1.2mm', textAlign: 'right' }}>{fmtMoeda(m.valorUnitario)}</td>
                      <td style={{ borderBottom: '1px solid #ddd', padding: '1.2mm', textAlign: 'right' }}>{fmtMoeda(m.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: '8pt', color: '#4b5563' }}>
            {renderRodape(configRelatorio.rodapeTexto || '{{GAEP}}', gaepCodigo)} · Documento de Missões
          </div>
        </div>
      </div>
    </div>
  )
}
