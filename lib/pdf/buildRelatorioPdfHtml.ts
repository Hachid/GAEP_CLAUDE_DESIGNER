import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import { DEFAULT_TITULO_RELATORIO_INSTITUCIONAL } from '@/lib/pdf/defaultTituloRelatorio'
import { escapeHtml } from '@/lib/pdf/escapeHtml'
import { estiloBlocoToInlineCss } from '@/lib/pdf/estiloRelatorioCss'

/**
 * Modelo de dados do relatório para o template HTML (equivalente às tags do Google Docs).
 * O HTML define margens, fundo (timbrado) e tipografia; o motor de impressão do Chromium
 * faz a paginação — mesmo papel conceitual do GAS + DocumentApp + export PDF.
 */
export type RelatorioPdfHtmlModel = {
  config: ConfigRelatorioUIData
  subtituloLinha: string
  dataLegenda: string
  periodoLegenda: string
  duracaoLegenda: string
  categoriaLegenda: string
  atividadeLegenda: string
  operadoresStr: string
  outrosIntegrantes: string | null
  relatoristaNome: string | null
  descricaoPrefix: string
  descricao: string
  ocorrencias: string | null
  fotoDataUrls: string[]
  emitidoEm: string
  versao: number
  rodapeTextoRenderizado: string
  timbradoDataUrl: string | null
  hash: string
  qrDataUrl: string
}

/**
 * Atributo `src` para PDF: só data URLs (Chromium + `escapeHtml` em https quebra `&` na query).
 */
function imgSrcForPdf(src: string): string {
  if (typeof src === 'string' && src.startsWith('data:image/')) {
    return src.replace(/"/g, '&quot;')
  }
  if (typeof src === 'string' && src.startsWith('data:')) {
    return src.replace(/"/g, '&quot;')
  }
  return ''
}

function secTitleCss(): string {
  return [
    'font-size:8pt',
    'font-weight:700',
    'text-transform:uppercase',
    'letter-spacing:0.05em',
    'color:#64748b',
    'margin:6pt 0 4pt 0',
  ].join(';')
}

function celulaLegenda(head: string, val: string): string {
  return `<div class="meta-celula">
            <div class="meta-celula-head">${escapeHtml(head)}</div>
            <div class="meta-celula-val">${escapeHtml(val)}</div>
          </div>`
}

/**
 * Monta um documento HTML completo para `page.pdf()` (A4, timbrado fixo atrás, conteúdo por cima).
 */
export function buildRelatorioPdfHtml(m: RelatorioPdfHtmlModel): string {
  const cfg = m.config
  const mrg = cfg.printMargins
  const titulo = escapeHtml(cfg.tituloTexto || DEFAULT_TITULO_RELATORIO_INSTITUCIONAL)
  const stTituloBase = estiloBlocoToInlineCss(cfg.tituloEstilo, 'titulo')
  /** Cor/tipografia base da config; tamanho e caixa alta vêm das classes `.report-title` (área segura do brasão). */
  const stTituloPdf = `${stTituloBase};text-transform:uppercase;white-space:pre-line`
  const stSubBase = estiloBlocoToInlineCss(cfg.subtituloEstilo, 'subtitulo')
  /** Subtítulo alinhado ao bloco de texto do cabeçalho (não invade coluna do brasão). */
  const stSubPdf = `${stSubBase};text-align:center;font-weight:700`
  const stDesc = estiloBlocoToInlineCss(cfg.descricaoEstilo, 'corpo')

  const descricaoCompleta = `${m.descricaoPrefix}${m.descricao}`

  const equipeLinhas: string[] = []
  if (m.operadoresStr.trim()) {
    equipeLinhas.push(`<div class="equipe-linha">${escapeHtml(m.operadoresStr)}</div>`)
  } else {
    equipeLinhas.push(`<div class="equipe-linha equipe-linha--placeholder">Não informado</div>`)
  }
  if (m.outrosIntegrantes) {
    equipeLinhas.push(
      `<div class="equipe-outros"><span class="equipe-outros-lab">Outros integrantes / forças amigas:</span> ${escapeHtml(m.outrosIntegrantes)}</div>`
    )
  }
  const equipeBloco = equipeLinhas.join('\n')

  const validFotoDataUrls = Array.isArray(m.fotoDataUrls)
    ? m.fotoDataUrls.filter((src) => typeof src === 'string' && src.startsWith('data:image/'))
    : []

  const fotosHtml =
    validFotoDataUrls.length === 0
      ? ''
      : `
  <section class="secao-fotos" aria-label="Fotos">
    <div class="secao-fotos-titulo">Registros fotográficos</div>
    <div class="fotos-area">
      <div class="fotos">
        ${validFotoDataUrls.map((src) => `<img class="foto" src="${imgSrcForPdf(src)}" alt="" />`).join('')}
      </div>
    </div>
  </section>`

  const timbradoHtml = m.timbradoDataUrl
    ? `<img class="timbrado" src="${imgSrcForPdf(m.timbradoDataUrl)}" alt="" />`
    : ''

  const subtituloConteudo = m.subtituloLinha.trim() ? escapeHtml(m.subtituloLinha) : '&#160;'

  const legendaHtml = [
    celulaLegenda('Data', m.dataLegenda),
    celulaLegenda('Período', m.periodoLegenda),
    celulaLegenda('Duração', m.duracaoLegenda),
    celulaLegenda('Categoria', m.categoriaLegenda),
    celulaLegenda('Atividade', m.atividadeLegenda),
  ].join('\n')

  const padBottomMm = (Number.isFinite(Number(mrg.bottom)) ? Number(mrg.bottom) : 24) + 5

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${titulo}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 297mm;
      max-width: 210mm;
      overflow-x: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Timbrado: preenche a folha A4 (100%). object-fit: fill evita faixas brancas nas bordas. */
    img.timbrado {
      position: fixed;
      top: 0;
      left: 0;
      width: 210mm;
      height: 297mm;
      object-fit: fill;
      z-index: 0;
      pointer-events: none;
    }
    .conteudo {
      position: relative;
      z-index: 1;
      padding: ${mrg.top}mm ${mrg.right}mm ${padBottomMm}mm ${mrg.left}mm;
      min-height: 297mm;
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .pagina-flex {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .fluxo-principal {
      flex: 1 1 auto;
      min-height: 0;
      padding-bottom: 5mm;
    }
    /* Cabeçalho: texto só na coluna esquerda; coluna direita reserva área do brasão do timbrado. */
    .cabecalho-bloco {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 32mm;
      column-gap: 4mm;
      align-items: start;
      margin: 0 0 12pt 0;
      padding-top: 2pt;
    }
    .cabecalho-texto {
      min-width: 0;
      max-width: 100%;
    }
    .cabecalho-reserva {
      min-height: 24mm;
      pointer-events: none;
    }
    h1.cabecalho-titulo {
      margin: 0;
      padding: 0;
      position: relative;
      z-index: 1;
    }
    .report-title {
      font-size: 13.5pt !important;
      line-height: 1.15 !important;
      letter-spacing: 0.04em !important;
      text-align: center !important;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
      hyphens: none;
    }
    h2.subtitulo {
      margin: 8pt 0 0 0;
      padding: 0 0 7pt 0;
      border-bottom: 1.25pt solid #334155;
      min-height: 1.05em;
    }
    .report-subtitle {
      font-size: 10pt !important;
      line-height: 1.22 !important;
      letter-spacing: 0.02em !important;
      text-align: center !important;
    }
    /* Legenda operacional: sempre 5 colunas (A4). */
    .meta-legenda {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      width: 100%;
      margin: 2pt 0 12pt 0;
      border: 0.6pt solid #94a3b8;
      border-radius: 2pt;
      overflow: hidden;
      background: #fff;
    }
    .meta-celula {
      min-width: 0;
      border-right: 0.5pt solid #cbd5e1;
    }
    .meta-celula:last-child { border-right: none; }
    .meta-celula-head {
      background: #dbeafe;
      color: #475569;
      font-size: 6.25pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.055em;
      padding: 3pt 5pt;
      border-bottom: 0.5pt solid #94a3b8;
    }
    .meta-celula-val {
      font-size: 8.25pt;
      font-weight: 700;
      color: #0f172a;
      padding: 4pt 5pt 5pt 5pt;
      line-height: 1.32;
      word-wrap: break-word;
    }
    /* Descrição: hierarquia e respiro interno. */
    .bloco-descricao-inst {
      border: 0.75pt solid #0f172a;
      padding: 12pt 14pt 14pt 14pt;
      margin: 0 0 12pt 0;
      background: #fff;
    }
    .equipe-linha {
      font-size: 9.5pt;
      color: #0f172a;
      line-height: 1.45;
      margin: 0 0 8pt 0;
      font-weight: 500;
    }
    .equipe-linha--placeholder {
      color: #64748b;
      font-style: italic;
    }
    .equipe-outros {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.35;
      margin: 0 0 8pt 0;
    }
    .equipe-outros-lab { font-weight: 700; color: #475569; }
    .rotulo-descricao-atividade {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin: 8pt 0 6pt 0;
    }
    .corpo-descricao-atividade {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      box-sizing: border-box;
      margin: 0;
      orphans: 2;
      widows: 2;
    }
    .bloco-ocorrencias {
      margin: 0 0 12pt 0;
      padding: 0 0 0 8pt;
      border-left: 2.5pt solid #64748b;
    }
    .bloco-texto { white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; margin-bottom: 10pt; }
    .secao-fotos {
      margin: 0 0 10mm 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .secao-fotos-titulo {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4338ca;
      margin: 0 0 4pt 0;
    }
    .fotos-area {
      border: 0.6pt solid #a5b4fc;
      padding: 8pt;
      background: #fafaff;
      border-radius: 2pt;
    }
    .fotos {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8pt 8pt;
      align-items: flex-start;
      justify-content: center;
    }
    img.foto {
      max-height: 6cm;
      max-width: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border: 0.5pt solid #bbb;
      display: block;
      flex: 0 1 auto;
    }
    .rodape {
      margin-top: auto;
      flex-shrink: 0;
      padding-top: 8pt;
      padding-bottom: 6mm;
      margin-bottom: 2mm;
      border-top: 0.5pt solid #cbd5e1;
      width: 100%;
      max-width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .rodape-assinatura {
      text-align: center;
      margin-bottom: 10pt;
    }
    .rodape-nome-destaque {
      margin: 0 0 5pt 0;
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .rodape-linha-ass {
      border-top: 0.6pt solid #0f172a;
      width: 55%;
      margin: 0 auto 0 auto;
      height: 0;
    }
    .rodape-cargo {
      font-size: 7pt;
      color: #64748b;
      margin: 4pt 0 0 0;
    }
    .rodape-row2 {
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10pt;
    }
    .rodape-textos {
      flex: 1;
      min-width: 0;
      text-align: left;
      color: rgba(0, 0, 0, 0.44);
      padding-right: 2mm;
      padding-bottom: 1mm;
    }
    .rodape-linha-auth {
      margin: 0 0 4pt 0;
      font-size: 8pt;
      line-height: 1.38;
      color: rgba(0, 0, 0, 0.44);
      word-break: break-all;
    }
    .rodape-linha-gen {
      margin: 0;
      font-size: 8pt;
      line-height: 1.38;
      color: rgba(0, 0, 0, 0.44);
    }
    .rodape-textos strong {
      font-weight: 700;
      color: rgba(0, 0, 0, 0.58);
    }
    .rodape-qr-wrap {
      flex-shrink: 0;
      align-self: flex-end;
      padding-bottom: 1mm;
    }
    .qr { width: 44pt; height: 44pt; display: block; }
  </style>
</head>
<body>
  ${timbradoHtml}
  <main class="conteudo">
    <div class="pagina-flex">
      <div class="fluxo-principal">
        <header class="cabecalho-bloco">
          <div class="cabecalho-texto">
            <h1 class="cabecalho-titulo report-title" style="${stTituloPdf}">${titulo}</h1>
            <h2 class="subtitulo report-subtitle" style="${stSubPdf}">${subtituloConteudo}</h2>
          </div>
          <div class="cabecalho-reserva" aria-hidden="true"></div>
        </header>

        <div class="meta-legenda" role="presentation">
          ${legendaHtml}
        </div>

        <div class="bloco-descricao-inst">
          ${equipeBloco}
          <div class="rotulo-descricao-atividade">DESCRIÇÃO DA ATIVIDADE</div>
          <div class="corpo-descricao-atividade" style="${stDesc}">${escapeHtml(descricaoCompleta)}</div>
        </div>

        ${
          m.ocorrencias
            ? `<div class="bloco-ocorrencias">
            <h2 style="${secTitleCss()}">Ocorrências / observações</h2>
            <div class="bloco-texto" style="${stDesc}">${escapeHtml(m.ocorrencias)}</div>
          </div>`
            : ''
        }

        ${fotosHtml}
      </div>

      <footer class="rodape">
        <div class="rodape-assinatura">
          <p class="rodape-nome-destaque">${escapeHtml(m.relatoristaNome || '—')}</p>
          <div class="rodape-linha-ass"></div>
          <p class="rodape-cargo">Relatorista — assinatura</p>
        </div>
        <div class="rodape-row2">
          <div class="rodape-textos">
            <p class="rodape-linha-auth"><strong>Autenticidade:</strong> ${escapeHtml(m.hash)}</p>
            <p class="rodape-linha-gen">Gerado em: ${escapeHtml(m.emitidoEm)} · v${m.versao}${
              m.rodapeTextoRenderizado ? ` · ${escapeHtml(m.rodapeTextoRenderizado)}` : ''
            }</p>
          </div>
          <div class="rodape-qr-wrap">
            <img class="qr" src="${imgSrcForPdf(m.qrDataUrl)}" alt="" width="44" height="44" />
          </div>
        </div>
      </footer>
    </div>
  </main>
</body>
</html>`
}
