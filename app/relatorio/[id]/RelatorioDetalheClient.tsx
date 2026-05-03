'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { RelatorioDetalhado } from '../actions'
import { editarRelatorio, excluirRelatorio } from '../actions'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import { DEFAULT_TITULO_RELATORIO_INSTITUCIONAL } from '@/lib/pdf/defaultTituloRelatorio'
import { QrCode } from '@/components/relatorio/QrCode'

interface Props {
  relatorio: RelatorioDetalhado
  perfil: string
  operadorId: string
  gaepCodigo: string
  configRelatorio: ConfigRelatorioUIData
  /** Hash estável + payload do QR (autenticidade). */
  integrity: { hash: string; qrPayload: string }
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

function formatarDataHora(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function renderRodape(texto: string, gaepCodigo: string, versao: number) {
  return texto.replaceAll('{{GAEP}}', gaepCodigo).replaceAll('{{VERSAO}}', String(versao))
}


const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', background: '#f3f4f6',
  border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', resize: 'vertical',
}

export function RelatorioDetalheClient({
  relatorio, perfil, operadorId, gaepCodigo, configRelatorio, integrity,
}: Props) {
  const router = useRouter()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)

  const [editando, setEditando] = useState(false)
  const [descricaoEdit, setDescricaoEdit] = useState(relatorio.descricao_revisada)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  /** PDF sob demanda: geração Playwright é pesada; só carrega ao pedir (melhora tempo até a página útil). */
  const [mostrarPdf, setMostrarPdf] = useState(false)

  const dataFmt = formatarData(relatorio.data)
  const categoriaNome = relatorio.categoria_nome ?? ''
  const atividadeNome = relatorio.atividade_nome ?? ''
  const tituloDoc = [categoriaNome, atividadeNome].filter(Boolean).join(' — ') || 'Relatório Operacional'
  /** Mesmo texto do preview Gestão (subtítulo configurável ou padrão). */
  const subtituloGestao =
    configRelatorio.subtituloTexto.trim() || 'RELATÓRIO DE ATIVIDADE(S)'
  const periodoStr = `${formatarHora(relatorio.hora_inicio)} às ${formatarHora(relatorio.hora_fim)}${relatorio.horas_totais ? ` (${relatorio.horas_totais}h)` : ''}`
  const duracaoStr =
    relatorio.horas_totais != null && Number.isFinite(Number(relatorio.horas_totais)) && relatorio.horas_totais >= 0
      ? `${relatorio.horas_totais}h`
      : 'Não informado'
  const equipeStr = relatorio.participantes.map((p) => p.nome).join(', ')
  const emitidoEm = formatarDataHora(relatorio.created_at)
  // Estilos calculados uma vez — usados no documento de tela e na impressão
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
  async function handleSalvarEdicao() {
    if (!descricaoEdit.trim()) { setErro('A descrição não pode estar vazia.'); return }
    setSalvando(true); setErro(null)
    const result = await editarRelatorio({ id: relatorio.id, descricaoRevisada: descricaoEdit, motivo, operadorId })
    setSalvando(false)
    if (result.error) { setErro(result.error) } else { setEditando(false); setMotivo(''); router.refresh() }
  }

  async function handleExcluir() {
    setSalvando(true); setErro(null)
    const result = await excluirRelatorio({ id: relatorio.id, operadorId })
    setSalvando(false)
    if (result.error) { setErro(result.error); setConfirmDelete(false) }
    else { router.push('/relatorio/historico') }
  }

  return (
    <div style={{ paddingBottom: 30 }}>

      {/* ══════════════════════════════════════════
          BARRA SUPERIOR (oculta na impressão)
      ══════════════════════════════════════════ */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Link href="/relatorio/historico" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.15rem', lineHeight: 1 }}>
          ←
        </Link>
        <span style={{ flex: 1, fontSize: '0.82rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dataFmt} · {tituloDoc}
        </span>
        <button
          type="button"
          onClick={() => setMostrarPdf((v) => !v)}
          style={{
            padding: '8px 14px',
            background: '#1a237e',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {mostrarPdf ? 'Ocultar PDF' : 'Ver PDF'}
        </button>
        <Link
          href={`/api/pdf/${relatorio.id}?download=1`}
          prefetch={false}
          download={`relatorio-${relatorio.id}.pdf`}
          style={{
            padding: '8px 12px',
            background: '#fff',
            color: '#1a237e',
            border: '1.5px solid #1a237e',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.78rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Baixar PDF
        </Link>
      </div>

      {mostrarPdf && (
        <div className="no-print" style={{ marginBottom: 14 }}>
          <iframe
            title="Relatório em PDF"
            src={`/api/pdf/${relatorio.id}`}
            style={{
              width: '100%',
              height: 'min(78vh, 820px)',
              minHeight: 360,
              border: '1.5px solid #e2e8f0',
              borderRadius: 12,
              background: '#f1f5f9',
              display: 'block',
            }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45 }}>
            O PDF aparece acima com o timbrado de fundo. No celular, use o menu do visualizador para
            {' '}<strong>compartilhar</strong> ou <strong>salvar</strong> o arquivo.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ERRO (oculto na impressão)
      ══════════════════════════════════════════ */}
      {erro && (
        <div className="no-print" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODO EDIÇÃO (oculto na impressão)
      ══════════════════════════════════════════ */}
      {editando && (
        <div className="no-print" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.09)', padding: '20px 20px', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, color: '#1a237e', fontSize: '0.9rem', marginBottom: 14 }}>Editar Texto do Relatório</div>
          <textarea rows={10} value={descricaoEdit} onChange={(e) => setDescricaoEdit(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={{ marginBottom: 14 }}>
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
      )}

      {/* ══════════════════════════════════════════
          DOCUMENTO NA TELA (oculto na impressão)
          Mostra o relatório formatado para leitura
          e compartilhamento via celular.
      ══════════════════════════════════════════ */}
      {!editando && (
        <div className="no-print" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', overflow: 'hidden', marginBottom: 14 }}>

          {/* Timbrado como imagem de cabeçalho */}
          {configRelatorio.timbradoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={configRelatorio.timbradoUrl} alt="Papel Timbrado" style={{ width: '100%', display: 'block' }} />
          )}

          <div style={{ padding: '18px 20px 20px' }}>

            {/* Título da organização */}
            <div style={{ ...tituloPrintStyle, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'pre-line', marginBottom: 8 }}>
              {configRelatorio.tituloTexto || DEFAULT_TITULO_RELATORIO_INSTITUCIONAL}
            </div>

            {/* Subtítulo — categoria e atividade (modelo novo) */}
            <div style={{ ...subtituloPrintStyle, borderBottom: '1.5px solid #333', paddingBottom: 8, marginBottom: 12 }}>
              {subtituloGestao}
            </div>

            {/* Bloco de metadados */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.83rem', color: '#334155', lineHeight: 1.7 }}>
              <div><strong>Data:</strong> {dataFmt}</div>
              <div><strong>Período:</strong> {periodoStr}</div>
              <div><strong>Duração:</strong> {duracaoStr}</div>
              {categoriaNome && <div><strong>Categoria:</strong> {categoriaNome}</div>}
              {atividadeNome && <div><strong>Atividade:</strong> {atividadeNome}</div>}
            </div>

            {/* Equipe */}
            {(equipeStr || relatorio.outros_integrantes || relatorio.relatorista_nome) && (
              <div style={{ marginBottom: 14, fontSize: '0.83rem', color: '#334155', lineHeight: 1.7 }}>
                {equipeStr && <div><strong>Operadores:</strong> {equipeStr}</div>}
                {relatorio.outros_integrantes && <div><strong>Outros Integrantes:</strong> {relatorio.outros_integrantes}</div>}
                {relatorio.relatorista_nome && <div><strong>Relatorista:</strong> {relatorio.relatorista_nome}</div>}
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 14 }} />

            {/* Texto do relatório */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 }}>
                Descrição da atividade
              </div>
              <p style={{ margin: 0, ...descricaoPrintStyle, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {configRelatorio.descricaoTexto ? `${configRelatorio.descricaoTexto}\n\n` : ''}
                {relatorio.descricao_revisada}
              </p>
            </div>

            {/* Ocorrências */}
            {relatorio.ocorrencias && (
              <>
                <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 14 }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 6 }}>
                    Ocorrências / Observações
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#475569' }}>
                    {relatorio.ocorrencias}
                  </p>
                </div>
              </>
            )}

            {/* Fotos */}
            {relatorio.fotos_urls && relatorio.fotos_urls.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 14 }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 }}>
                    Registro Fotográfico
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {relatorio.fotos_urls.slice(0, 3).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Foto ${i + 1}`} style={{ width: 150, height: 170, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Rodapé de validação — texto à esquerda, QR à direita */}
            <div style={{ borderTop: '1px solid #cbd5e1', marginTop: 18, paddingTop: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#1a237e', marginBottom: 3 }}>
                  Relatório confeccionado pelo sistema GAEP
                </div>
                <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: 1.6 }}>
                  {relatorio.relatorista_nome && <span>Relatorista: <strong>{relatorio.relatorista_nome}</strong> · </span>}
                  Gerado em: <strong>{emitidoEm}</strong> · v{relatorio.versao}
                  {renderRodape(configRelatorio.rodapeTexto, gaepCodigo, relatorio.versao) && (
                    <span> · {renderRodape(configRelatorio.rodapeTexto, gaepCodigo, relatorio.versao)}</span>
                  )}
                  <span> · Autenticidade: <strong>{integrity.hash}</strong></span>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <QrCode value={integrity.qrPayload} size={44} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          AÇÕES ADMIN (ocultas na impressão)
      ══════════════════════════════════════════ */}
      {isAdmin && !editando && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
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
        <div className="no-print" style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
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

      {/* ══════════════════════════════════════════
          PÁGINA DE IMPRESSÃO A4
          Oculta na tela — exibida apenas ao imprimir.
          O timbrado ocupa 100% do fundo via .print-page-bg.
          O conteúdo é posicionado absolutamente pelo printMargins.
      ══════════════════════════════════════════ */}
      <div className="print-page">
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
          {/* Título */}
          <div style={{
            ...tituloPrintStyle,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '2mm',
            whiteSpace: 'pre-line',
          }}>
            {configRelatorio.tituloTexto || DEFAULT_TITULO_RELATORIO_INSTITUCIONAL}
          </div>

          {/* Subtítulo — categoria e atividade */}
          <div style={{
            ...subtituloPrintStyle,
            fontWeight: 700,
            borderBottom: '1.5pt solid #1e293b',
            paddingBottom: '2.5mm',
            marginBottom: '4mm',
          }}>
            {subtituloGestao}
          </div>

          {/* Legenda — 5 colunas (igual ao PDF) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              width: '100%',
              marginBottom: '4mm',
              border: '0.6pt solid #94a3b8',
              borderRadius: 2,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            {[
              { head: 'Data', val: dataFmt || '—' },
              { head: 'Período', val: periodoStr },
              { head: 'Duração', val: duracaoStr },
              { head: 'Categoria', val: categoriaNome || 'Não informado' },
              { head: 'Atividade', val: atividadeNome || 'Não informado' },
            ].map((cell, i, arr) => (
              <div
                key={cell.head}
                style={{
                  minWidth: 0,
                  borderRight: i < arr.length - 1 ? '0.5pt solid #cbd5e1' : undefined,
                }}
              >
                <div
                  style={{
                    background: '#dbeafe',
                    color: '#475569',
                    fontSize: '6.25pt',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.055em',
                    padding: '1.2mm 1.6mm',
                    borderBottom: '0.5pt solid #94a3b8',
                  }}
                >
                  {cell.head}
                </div>
                <div style={{ fontSize: '8.25pt', fontWeight: 700, color: '#0f172a', padding: '1.6mm 1.8mm 1.8mm 1.8mm', lineHeight: 1.32, wordWrap: 'break-word' }}>{cell.val}</div>
              </div>
            ))}
          </div>

          {/* Bloco descrição: borda + equipe + rótulo + texto (igual ao PDF) */}
          <div style={{ border: '0.75pt solid #0f172a', padding: '2.2mm 2.6mm 2.6mm 2.6mm', marginBottom: '4mm', background: '#fff' }}>
            {equipeStr ? (
              <div style={{ fontSize: '9.5pt', color: '#0f172a', lineHeight: 1.4, marginBottom: '1.8mm', fontWeight: 500 }}>{equipeStr}</div>
            ) : null}
            {relatorio.outros_integrantes ? (
              <div style={{ fontSize: '8.5pt', color: '#334155', lineHeight: 1.35, marginBottom: '2.2mm' }}>
                <span style={{ fontWeight: 700, color: '#475569' }}>Outros integrantes / forças amigas:</span>{' '}
                {relatorio.outros_integrantes}
              </div>
            ) : null}
            <div style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1.4mm' }}>
              Descrição da atividade
            </div>
            <p
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                boxSizing: 'border-box',
                ...descricaoPrintStyle,
              }}
            >
              {configRelatorio.descricaoTexto ? `${configRelatorio.descricaoTexto}\n\n` : ''}
              {relatorio.descricao_revisada}
            </p>
          </div>

          {/* Ocorrências */}
          {relatorio.ocorrencias && (
            <div style={{ margin: '0 0 4mm 0', padding: '0 0 0 2mm', borderLeft: '2.5pt solid #64748b' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1.5mm' }}>
                Ocorrências / observações
              </div>
              <p style={{ margin: 0, fontSize: '10pt', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#000' }}>
                {relatorio.ocorrencias}
              </p>
            </div>
          )}

          {relatorio.fotos_urls && relatorio.fotos_urls.length > 0 && (
            <div style={{ margin: '1mm 0 5mm 0' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4338ca', marginBottom: '1.2mm' }}>
                Registros fotográficos
              </div>
              <div style={{ border: '0.6pt solid #a5b4fc', padding: '2mm', background: '#fafaff', borderRadius: 2 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm' }}>
                  {relatorio.fotos_urls.slice(0, 3).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- impressão A4, URLs dinâmicas
                    <img
                      key={i}
                      src={url}
                      alt={`Foto ${i + 1}`}
                      style={{ width: '150pt', height: '170pt', objectFit: 'cover', border: '0.5pt solid #94a3b8' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rodapé de validação — texto à esquerda, QR à direita (como o PDF) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderTop: '0.5pt solid #cbd5e1',
              paddingTop: '2mm',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '3mm',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '7pt', color: '#475569', letterSpacing: '0.3pt' }}>
                Relatório confeccionado pelo sistema GAEP
              </div>
              <div style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '0.5mm', lineHeight: 1.4 }}>
                Organização: {gaepCodigo} &nbsp;·&nbsp;
                Relatorista: {relatorio.relatorista_nome ?? '—'} &nbsp;·&nbsp;
                Gerado em: {emitidoEm} &nbsp;·&nbsp;
                v{relatorio.versao}
                {renderRodape(configRelatorio.rodapeTexto, gaepCodigo, relatorio.versao) && (
                  <> &nbsp;·&nbsp; {renderRodape(configRelatorio.rodapeTexto, gaepCodigo, relatorio.versao)}</>
                )}
                <br />
                Autenticidade (SHA-256): {integrity.hash}
              </div>
            </div>
            <div style={{ flexShrink: 0, paddingBottom: '0.5mm' }}>
              <QrCode value={integrity.qrPayload} size={45} />
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
