'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { RelatorioDetalhado } from '../actions'
import { editarRelatorio, excluirRelatorio } from '../actions'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'

interface Props {
  relatorio: RelatorioDetalhado
  perfil: string
  operadorId: string
  gaepCodigo: string
  configRelatorio: ConfigRelatorioUIData
  /** Abre o diálogo de impressão/PDF ao carregar (timbrado e estilos da gestão). */
  autoPrintPdf?: boolean
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarHora(hora: string | null): string {
  if (!hora) return '--:--'
  return hora.slice(0, 5)
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  background: '#f3f4f6',
  border: '1px solid #e2e8f0',
  color: '#1e293b',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'vertical',
}

function renderRodape(texto: string, gaepCodigo: string, versao: number) {
  return texto.replaceAll('{{GAEP}}', gaepCodigo).replaceAll('{{VERSAO}}', String(versao))
}

export function RelatorioDetalheClient({
  relatorio,
  perfil,
  operadorId,
  gaepCodigo,
  configRelatorio,
  autoPrintPdf = false,
}: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!autoPrintPdf) return
    const id = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(id)
  }, [autoPrintPdf])
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)

  const [editando, setEditando] = useState(false)
  const [descricaoEdit, setDescricaoEdit] = useState(relatorio.descricao_revisada)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const dataFmt = formatarData(relatorio.data)
  const categoriaNome = relatorio.categoria_nome ?? ''
  const atividadeNome = relatorio.atividade_nome ?? ''
  const titulo = [categoriaNome, atividadeNome].filter(Boolean).join(' - ') || 'Relatório Operacional'
  const periodoStr = `${formatarHora(relatorio.hora_inicio)} às ${formatarHora(relatorio.hora_fim)}${relatorio.horas_totais ? ` (${relatorio.horas_totais}h)` : ''}`
  const equipeStr = relatorio.participantes.map((p) => p.nome).join(', ')
  const tituloPrintStyle: React.CSSProperties = {
    fontFamily: configRelatorio.tituloEstilo.fontFamily,
    color: configRelatorio.tituloEstilo.fontColor,
    textAlign: configRelatorio.tituloEstilo.align,
    marginLeft: `${configRelatorio.tituloEstilo.indent}px`,
    lineHeight: configRelatorio.tituloEstilo.lineHeight,
    fontSize: `${configRelatorio.tituloEstilo.fontSize ?? 12}pt`,
    fontWeight: configRelatorio.tituloEstilo.bold === false ? 'normal' : 'bold',
    fontStyle: configRelatorio.tituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: configRelatorio.tituloEstilo.underline ? 'underline' : 'none',
    marginTop: configRelatorio.tituloEstilo.marginTop ? `${configRelatorio.tituloEstilo.marginTop}mm` : undefined,
    marginBottom: configRelatorio.tituloEstilo.marginBottom !== undefined ? `${configRelatorio.tituloEstilo.marginBottom}mm` : undefined,
  }
  const subtituloPrintStyle: React.CSSProperties = {
    fontFamily: configRelatorio.subtituloEstilo.fontFamily,
    color: configRelatorio.subtituloEstilo.fontColor,
    textAlign: configRelatorio.subtituloEstilo.align,
    marginLeft: `${configRelatorio.subtituloEstilo.indent}px`,
    lineHeight: configRelatorio.subtituloEstilo.lineHeight,
    fontSize: `${configRelatorio.subtituloEstilo.fontSize ?? 11}pt`,
    fontWeight: configRelatorio.subtituloEstilo.bold ? 'bold' : 'normal',
    fontStyle: configRelatorio.subtituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: configRelatorio.subtituloEstilo.underline ? 'underline' : 'none',
    marginTop: configRelatorio.subtituloEstilo.marginTop ? `${configRelatorio.subtituloEstilo.marginTop}mm` : undefined,
    marginBottom: configRelatorio.subtituloEstilo.marginBottom !== undefined ? `${configRelatorio.subtituloEstilo.marginBottom}mm` : undefined,
  }
  const descricaoPrintStyle: React.CSSProperties = {
    fontFamily: configRelatorio.descricaoEstilo.fontFamily,
    color: configRelatorio.descricaoEstilo.fontColor,
    textAlign: configRelatorio.descricaoEstilo.align,
    marginLeft: `${configRelatorio.descricaoEstilo.indent}px`,
    lineHeight: configRelatorio.descricaoEstilo.lineHeight,
    fontSize: `${configRelatorio.descricaoEstilo.fontSize ?? 11}pt`,
    fontWeight: configRelatorio.descricaoEstilo.bold ? 'bold' : 'normal',
    fontStyle: configRelatorio.descricaoEstilo.italic ? 'italic' : 'normal',
    textDecoration: configRelatorio.descricaoEstilo.underline ? 'underline' : 'none',
    marginTop: configRelatorio.descricaoEstilo.marginTop ? `${configRelatorio.descricaoEstilo.marginTop}mm` : undefined,
    marginBottom: configRelatorio.descricaoEstilo.marginBottom !== undefined ? `${configRelatorio.descricaoEstilo.marginBottom}mm` : undefined,
  }
  const rodapePrintStyle: React.CSSProperties = {
    fontFamily: configRelatorio.rodapeEstilo.fontFamily,
    color: configRelatorio.rodapeEstilo.fontColor,
    textAlign: configRelatorio.rodapeEstilo.align,
    marginLeft: `${configRelatorio.rodapeEstilo.indent}px`,
    lineHeight: configRelatorio.rodapeEstilo.lineHeight,
    fontSize: `${configRelatorio.rodapeEstilo.fontSize ?? 8}pt`,
    fontWeight: configRelatorio.rodapeEstilo.bold ? 'bold' : 'normal',
    fontStyle: configRelatorio.rodapeEstilo.italic ? 'italic' : 'normal',
    textDecoration: configRelatorio.rodapeEstilo.underline ? 'underline' : 'none',
    marginTop: configRelatorio.rodapeEstilo.marginTop ? `${configRelatorio.rodapeEstilo.marginTop}mm` : undefined,
  }

  const legendaStr = [
    `Data: ${dataFmt}`,
    `${formatarHora(relatorio.hora_inicio)} às ${formatarHora(relatorio.hora_fim)}`,
    categoriaNome ? `Categoria: ${categoriaNome}` : '',
    atividadeNome ? `Atividade: ${atividadeNome}` : '',
  ].filter(Boolean).join(' | ')

  async function handleSalvarEdicao() {
    if (!descricaoEdit.trim()) { setErro('A descrição não pode estar vazia.'); return }
    setSalvando(true)
    setErro(null)
    const result = await editarRelatorio({ id: relatorio.id, descricaoRevisada: descricaoEdit, motivo, operadorId })
    setSalvando(false)
    if (result.error) {
      setErro(result.error)
    } else {
      setEditando(false)
      setMotivo('')
      router.refresh()
    }
  }

  async function handleExcluir() {
    setSalvando(true)
    setErro(null)
    const result = await excluirRelatorio({ id: relatorio.id, operadorId })
    setSalvando(false)
    if (result.error) {
      setErro(result.error)
      setConfirmDelete(false)
    } else {
      router.push('/relatorio/historico')
    }
  }

  return (
    <div style={{ paddingBottom: 30 }}>

      {/* ══════════════════════════════════════════
          VIEW DE TELA  (oculta na impressão)
      ══════════════════════════════════════════ */}
      <div className="no-print">

        {/* Barra de ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Link href="/relatorio/historico" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem' }}>
            ←
          </Link>
          <span style={{ flex: 1, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {dataFmt} · {titulo}
          </span>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            🖨 Imprimir / PDF
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
            {erro}
          </div>
        )}

        {/* Card do relatório */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.09)', overflow: 'hidden', marginBottom: 16 }}>
          {/* Cabeçalho azul */}
          <div style={{ background: '#1a237e', padding: '20px 24px', color: '#fff' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.75, marginBottom: 4 }}>
              {gaepCodigo} · Relatório Operacional
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{titulo}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: 6 }}>
              {dataFmt} · {periodoStr}
            </div>
          </div>

          {/* Corpo */}
          <div style={{ padding: '20px 24px' }}>
            {equipeStr && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 6 }}>
                  Equipe Operacional
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {relatorio.participantes.map((p) => (
                    <span key={p.id} style={{ background: 'rgba(26,35,126,0.08)', color: '#1a237e', borderRadius: 20, padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700 }}>
                      {p.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {relatorio.outros_integrantes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>Outros Integrantes</div>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>{relatorio.outros_integrantes}</div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0 14px' }} />

            {/* Texto do relatório */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 }}>
                Texto do Relatório
              </div>
              {editando ? (
                <div>
                  <textarea rows={8} value={descricaoEdit} onChange={(e) => setDescricaoEdit(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>Motivo da Edição</div>
                    <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo..." style={{ ...inputStyle, resize: undefined }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSalvarEdicao} disabled={salvando} style={{ flex: 1, padding: '12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                      {salvando ? 'Salvando...' : 'Salvar Edição'}
                    </button>
                    <button onClick={() => { setEditando(false); setDescricaoEdit(relatorio.descricao_revisada); setErro(null) }} style={{ flex: 1, padding: '12px', background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, lineHeight: 1.8, color: '#1e293b', fontSize: '0.95rem', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', textAlign: 'justify' }}>
                  {relatorio.descricao_revisada}
                </p>
              )}
            </div>

            {relatorio.ocorrencias && (
              <>
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0 14px' }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 6 }}>Ocorrências / Observações</div>
                  <p style={{ margin: 0, lineHeight: 1.7, color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{relatorio.ocorrencias}</p>
                </div>
              </>
            )}

            {relatorio.fotos_urls && relatorio.fotos_urls.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0 14px' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 }}>Registro Fotográfico</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {relatorio.fotos_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Foto ${i + 1}`} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 18, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>v{relatorio.versao} · {new Date(relatorio.created_at).toLocaleDateString('pt-BR')}</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{relatorio.relatorista_nome ?? ''}</span>
            </div>
          </div>
        </div>

        {/* Ações Admin */}
        {isAdmin && !editando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setEditando(true)} style={{ padding: '13px', background: 'transparent', color: '#1a237e', border: '1.5px solid #1a237e', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
              Editar Texto
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px', background: 'transparent', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Excluir Relatório
              </button>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
                  Confirmar exclusão? O registro permanece no banco.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleExcluir} disabled={salvando} style={{ flex: 1, padding: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                    {salvando ? 'Excluindo...' : 'Confirmar'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Histórico de versões */}
        {isAdmin && relatorio.versoes.length > 0 && (
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', marginTop: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 10 }}>
              Histórico de Versões
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {relatorio.versoes.map((v) => (
                <div key={v.id} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4 }}>
                    v{v.versao} · {v.editado_por_nome ?? 'desconhecido'} · {new Date(v.created_at).toLocaleString('pt-BR')}
                    {v.motivo ? ` · "${v.motivo}"` : ''}
                  </div>
                  {v.descricao_anterior && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', whiteSpace: 'pre-wrap' }}>{v.descricao_anterior}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          VIEW DE IMPRESSÃO  (oculta na tela, exibida no print)
          O CSS .print-page define: timbrado como background-image,
          tamanho A4, e .print-page-content posiciona o conteúdo
          dentro da área branca do timbrado.
      ══════════════════════════════════════════ */}
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
          {/* Título — nome da organização (multi-linha) */}
          <div style={{ ...tituloPrintStyle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2mm', whiteSpace: 'pre-line' }}>
            {configRelatorio.tituloTexto || 'RELATÓRIO OPERACIONAL'}
          </div>

          {/* Subtítulo — tipo do documento */}
          <div style={{ ...subtituloPrintStyle, marginBottom: '3mm', paddingBottom: '3mm', borderBottom: '1.5px solid #333' }}>
            {configRelatorio.subtituloTexto || 'RELATÓRIO DE ATIVIDADE(S)'}
          </div>

          {/* Legenda — metadados em linha */}
          <div style={{ fontSize: '9pt', color: '#333', marginBottom: '4mm', lineHeight: 1.5 }}>
            {legendaStr}
          </div>

          {/* Participantes */}
          {(equipeStr || relatorio.outros_integrantes || relatorio.relatorista_nome) && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '9pt' }}>
              <tbody>
                {equipeStr && (
                  <tr>
                    <td style={{ paddingBottom: '1.5mm' }}>
                      <strong>Equipe:</strong> {equipeStr}
                    </td>
                  </tr>
                )}
                {relatorio.outros_integrantes && (
                  <tr>
                    <td style={{ paddingBottom: '1.5mm' }}>
                      <strong>Outros Integrantes:</strong> {relatorio.outros_integrantes}
                    </td>
                  </tr>
                )}
                {relatorio.relatorista_nome && (
                  <tr>
                    <td>
                      <strong>Relatorista:</strong> {relatorio.relatorista_nome}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Linha divisória */}
          <hr style={{ border: 'none', borderTop: '1px solid #555', margin: '4mm 0' }} />

          {/* Texto do relatório */}
          <div style={{ marginBottom: '5mm' }}>
            <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#555', marginBottom: '3mm' }}>
              Texto do Relatório
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', ...descricaoPrintStyle }}>
              {configRelatorio.descricaoTexto ? `${configRelatorio.descricaoTexto}\n\n` : ''}
              {relatorio.descricao_revisada}
            </p>
          </div>

          {/* Ocorrências */}
          {relatorio.ocorrencias && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '4mm 0' }} />
              <div style={{ marginBottom: '5mm' }}>
                <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#555', marginBottom: '3mm' }}>
                  Ocorrências / Observações
                </div>
                <p style={{ margin: 0, fontSize: '10pt', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#000' }}>
                  {relatorio.ocorrencias}
                </p>
              </div>
            </>
          )}

          {/* Assinatura */}
          <div style={{ marginTop: '14mm', display: 'flex', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60mm', borderTop: '1px solid #000', paddingTop: '3mm', fontSize: '10pt' }}>
                {relatorio.relatorista_nome ?? 'Relatorista'}
              </div>
            </div>
          </div>

          {/* Rodapé do documento */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: '8pt', ...rodapePrintStyle }}>
            <span>
              {renderRodape(configRelatorio.rodapeTexto, gaepCodigo, relatorio.versao)} · Emitido em{' '}
              {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>

        </div>
      </div>

    </div>
  )
}
