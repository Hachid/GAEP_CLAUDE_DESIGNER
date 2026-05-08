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
  /** Nome completo do relatorista; quando existir, usado no rodapé em preferência a `relatoristaNome`. */
  relatoristaNomeCompleto?: string | null
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

  const nFotos = validFotoDataUrls.length
  const fotosGridClass =
    nFotos === 1 ? 'fotos-grid fotos-grid--1' : nFotos === 2 ? 'fotos-grid fotos-grid--2' : 'fotos-grid fotos-grid--3'

  const fotosCardsHtml = validFotoDataUrls
    .map(
      (src) =>
        `<div class="foto-card"><img class="foto" src="${imgSrcForPdf(src)}" alt="" onerror="this.onerror=null;this.parentNode.style.display='none'" /></div>`
    )
    .join('')

  const fotosHtml =
    nFotos === 0
      ? ''
      : `
  <section class="secao-fotos" aria-label="Fotos">
    <div class="fotos-bloco-unido">
      <div class="secao-fotos-titulo">REGISTROS FOTOGRÁFICOS</div>
      <div class="fotos-area">
        <div class="${fotosGridClass}">
          ${fotosCardsHtml}
        </div>
      </div>
    </div>
  </section>`

  const relatoristaParaRodape =
    (m.relatoristaNomeCompleto ?? m.relatoristaNome ?? '').trim() || '—'

  const timbradoHtml = m.timbradoDataUrl
    ? `<img class="timbrado" src="${imgSrcForPdf(m.timbradoDataUrl)}" alt="" />`
    : ''

  /** Texto fixo do subtítulo no PDF (substitui categoria/atividade, ex.: INSTRUIR — Administrativo). */
  const subtituloConteudo = escapeHtml('Relatório de Atividades - GAEP-CAT')

  const legendaHtml = [
    celulaLegenda('Data', m.dataLegenda),
    celulaLegenda('Período', m.periodoLegenda),
    celulaLegenda('Duração', m.duracaoLegenda),
    celulaLegenda('Categoria', m.categoriaLegenda),
    celulaLegenda('Atividade', m.atividadeLegenda),
  ].join('\n')

  const mrgBottomNum = Number.isFinite(Number(mrg.bottom)) ? Number(mrg.bottom) : 24
  /**
   * Ancoragem do rodapé fixo na faixa marrom/escura do timbrado (perto da borda da folha).
   * Não reutilizar `mrg.bottom` aqui: esse valor reserva a área clara de texto e empurra o rodapé para cima,
   * deixando Relatorista/Autenticidade na zona branca.
   */
  const footerDockBottomMm = 5
  /** Reserva no fluxo para não sobrepor o bloco do rodapé (altura aprox. + dock). */
  const conteudoPadBottomMm = Math.max(mrgBottomNum + 18, footerDockBottomMm + 32)

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
      width: 210mm;
      min-height: 297mm;
      max-width: 210mm;
      overflow-x: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Timbrado: camada inferior, folha inteira A4 (inclui faixa escura inferior). */
    img.timbrado {
      position: fixed;
      top: 0;
      left: 0;
      width: 210mm;
      min-width: 210mm;
      height: 297mm;
      min-height: 297mm;
      object-fit: fill;
      object-position: center top;
      z-index: 0;
      pointer-events: none;
    }
    .conteudo {
      position: relative;
      z-index: 1;
      padding: ${mrg.top}mm ${mrg.right}mm ${conteudoPadBottomMm}mm ${mrg.left}mm;
      min-height: auto;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .fluxo-principal {
      padding-bottom: 2mm;
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
    /* Legenda: 5 colunas, sem caixa (só tipografia sobre o timbrado). */
    .meta-legenda {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      column-gap: 4pt;
      width: 100%;
      margin: 2pt 0 12pt 0;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      border-radius: 0;
      overflow: visible;
    }
    .meta-celula {
      min-width: 0;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    .meta-celula-head {
      background: transparent !important;
      color: #475569;
      font-size: 6.25pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.055em;
      padding: 0 0 2pt 0;
      border: none !important;
    }
    .meta-celula-val {
      font-size: 8.25pt;
      font-weight: 700;
      color: #0f172a;
      padding: 0 0 2pt 0;
      line-height: 1.32;
      word-wrap: break-word;
      background: transparent !important;
      border: none !important;
    }
    /* Descrição: sem caixa; texto sobre o timbrado. */
    .bloco-descricao-inst {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 12pt 0 16pt 0;
      margin: 0 0 14pt 0;
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
      white-space: pre-line;
      word-wrap: break-word;
      overflow-wrap: break-word;
      text-align: justify;
      text-indent: 1.5em;
      box-sizing: border-box;
      margin: 0;
      padding: 0 0 3pt 0;
      orphans: 2;
      widows: 2;
    }
    .bloco-ocorrencias {
      margin: 0 0 12pt 0;
      padding: 8pt 10pt;
      border-left: 2.5pt solid #ca8a04 !important;
      background: #fef9c3 !important;
      border-radius: 5pt;
    }
    .bloco-texto { white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; margin-bottom: 10pt; }
    /* Fotos: título + grade ficam juntos (evita título órfão); cards não cortam ao meio. */
    .secao-fotos {
      margin: 12pt 0 8mm 0;
      break-inside: auto;
      page-break-inside: auto;
    }
    .fotos-bloco-unido {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .secao-fotos-titulo {
      font-size: 8.25pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #172554;
      margin: 0 0 6px 0;
      padding-bottom: 0;
      border: none !important;
      break-after: avoid;
      page-break-after: avoid;
    }
    .fotos-area {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 4px 0 0 0;
      border-radius: 0;
    }
    .fotos-grid {
      display: grid;
      gap: 6px;
      width: 100%;
      break-inside: auto;
      page-break-inside: auto;
      border: none !important;
      background: transparent !important;
    }
    .fotos-grid--1 {
      grid-template-columns: minmax(0, 1fr);
      max-width: 11.5cm;
      margin: 0 auto;
    }
    .fotos-grid--2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .fotos-grid--3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .fotos-grid--3 .foto-card:nth-child(3) {
      grid-column: 1 / -1;
      justify-self: center;
      width: min(8cm, calc((100% - 6px) / 2));
      max-width: 100%;
    }
    .foto-card {
      box-sizing: border-box;
      height: 5.4cm;
      min-height: 5.4cm;
      padding: 2px;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .foto {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    /* Rodapé fixo ancorado na faixa marrom inferior do timbrado; Chromium repete em cada página. */
    .rodape-fixo {
      position: fixed;
      left: ${mrg.left}mm;
      right: ${mrg.right}mm;
      bottom: ${footerDockBottomMm}mm;
      z-index: 20;
      min-height: 17mm;
      margin: 0;
      padding: 0;
      border: none;
      border-top: 0.35pt solid rgba(255, 255, 255, 0.2);
      box-sizing: border-box;
      background: transparent;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 3mm;
      color: rgba(255, 255, 255, 0.88);
      font-size: 7.5pt;
      line-height: 1.35;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .rodape-info {
      flex: 1 1 auto;
      min-width: 0;
      max-width: calc(100% - 58px - 3mm);
      min-height: 15mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 1.5px;
      word-break: break-word;
    }
    .rodape-info strong {
      color: rgba(255, 255, 255, 0.96);
      font-weight: 700;
    }
    .rodape-info-linha-auth {
      word-break: break-all;
    }
    /* Sem timbrado: rodapé sobre fundo claro */
    body.pdf-sem-timbrado .rodape-fixo {
      color: rgba(0, 0, 0, 0.55);
      border-top: 0.35pt solid rgba(15, 23, 42, 0.15);
    }
    body.pdf-sem-timbrado .rodape-info strong {
      color: rgba(0, 0, 0, 0.72);
    }
    /* Contraste do QR sobre faixa escura */
    .rodape-fixo .qr {
      width: 54px;
      height: 54px;
      flex: 0 0 auto;
      object-fit: contain;
      display: block;
      padding: 2px;
      background: #fff;
      border-radius: 2px;
      box-sizing: content-box;
    }
  </style>
</head>
<body class="${m.timbradoDataUrl ? 'pdf-com-timbrado' : 'pdf-sem-timbrado'}">
  ${timbradoHtml}
  <main class="conteudo">
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
            <h2 style="${secTitleCss()};color:#92400e;">❗ Ocorrências / observações</h2>
            <div class="bloco-texto" style="${stDesc};color:#78350f;">${escapeHtml(m.ocorrencias)}</div>
          </div>`
            : ''
        }

        ${fotosHtml}
      </div>
  </main>
  <footer class="rodape-fixo" role="contentinfo">
    <div class="rodape-info">
      <div><strong>Relatorista:</strong> ${escapeHtml(relatoristaParaRodape)}</div>
      <div class="rodape-info-linha-auth"><strong>Autenticidade:</strong> ${escapeHtml(m.hash)}</div>
      <div>Gerado em: ${escapeHtml(m.emitidoEm)} · v${m.versao}${
        m.rodapeTextoRenderizado ? ` · ${escapeHtml(m.rodapeTextoRenderizado)}` : ''
      }</div>
    </div>
    <img class="qr" src="${imgSrcForPdf(m.qrDataUrl)}" alt="QR Code de autenticação" width="54" height="54" />
  </footer>
</body>
</html>`
}
