import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import type { AtividadeStat, KPIData, EvolucaoMes, RelatorioLinhaConsolidado } from '@/app/(app)/dashboard/types'
import { escapeHtml } from '@/lib/pdf/escapeHtml'
import { estiloBlocoToInlineCss } from '@/lib/pdf/estiloRelatorioCss'
import { formatMinutos, CAT_COLORS, CAT_ORDER } from '@/app/(app)/dashboard/utils'

function imgSrcForPdf(src: string): string {
  if (typeof src === 'string' && src.startsWith('data:image/')) {
    return src.replace(/"/g, '&quot;')
  }
  if (typeof src === 'string' && src.startsWith('data:')) {
    return src.replace(/"/g, '&quot;')
  }
  return ''
}

function fmtDataBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

function secTitleCss(): string {
  return [
    'font-size:8.25pt',
    'font-weight:700',
    'text-transform:uppercase',
    'letter-spacing:0.06em',
    'color:#334155',
    'margin:10pt 0 6pt 0',
    'border-bottom:0.5pt solid #cbd5e1',
    'padding-bottom:3pt',
    'break-after:avoid',
    'page-break-after:avoid',
  ].join(';')
}

function catKey(nome: string | null | undefined): string {
  return (nome ?? '').trim().toUpperCase()
}

/** Agrupa ranking por OPERAR / TREINAR / INSTRUIR e depois demais categorias. */
function rankingAtividadesPorCategoriaOrdenado(ranking: AtividadeStat[]): {
  titulo: string
  items: AtividadeStat[]
}[] {
  const buckets = new Map<string, AtividadeStat[]>()
  for (const k of CAT_ORDER) buckets.set(k, [])
  const outros: AtividadeStat[] = []
  for (const a of ranking) {
    const k = catKey(a.categoriaNome)
    if (buckets.has(k)) buckets.get(k)!.push(a)
    else outros.push(a)
  }
  const blocos: { titulo: string; items: AtividadeStat[] }[] = []
  for (const k of CAT_ORDER) {
    const items = (buckets.get(k) ?? []).sort((x, y) => y.totalMinutos - x.totalMinutos)
    if (items.length) blocos.push({ titulo: k, items })
  }
  if (outros.length) {
    const byCat = new Map<string, AtividadeStat[]>()
    for (const a of outros) {
      const ck = catKey(a.categoriaNome) || '—'
      const cur = byCat.get(ck) ?? []
      cur.push(a)
      byCat.set(ck, cur)
    }
    const keys = [...byCat.keys()].sort()
    for (const ck of keys) {
      const items = (byCat.get(ck) ?? []).sort((x, y) => y.totalMinutos - x.totalMinutos)
      if (items.length) blocos.push({ titulo: ck, items })
    }
  }
  return blocos
}

function barRowsForGroup(items: AtividadeStat[]): string {
  if (items.length === 0) return ''
  const maxAt = Math.max(1, ...items.map((a) => a.totalMinutos))
  return items
    .map((a) => {
      const pct = Math.round((a.totalMinutos / maxAt) * 100)
      const color = CAT_COLORS[catKey(a.categoriaNome)] ?? '#475569'
      return `<tr>
        <td style="padding:3pt 0;font-size:8pt;font-weight:600;color:#0f172a;vertical-align:middle;">${escapeHtml(a.nome)}</td>
        <td style="padding:3pt 0 3pt 8pt;width:52%;vertical-align:middle;">
          <div style="height:8pt;background:#f1f5f9;border-radius:2pt;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};"></div>
          </div>
        </td>
        <td style="padding:3pt 0 3pt 6pt;font-size:7.5pt;font-weight:700;color:#475569;white-space:nowrap;text-align:right;">${escapeHtml(formatMinutos(a.totalMinutos))}</td>
      </tr>`
    })
    .join('')
}

function buildChartsHtml(kpi: KPIData, evolucao: EvolucaoMes[]): string {
  const totalCatMin = kpi.porCategoria.reduce((acc, c) => acc + c.totalMinutos, 0)
  const maxCat = Math.max(1, ...kpi.porCategoria.map((c) => c.totalMinutos))
  const donutRows = kpi.porCategoria
    .map((c) => {
      const pctBar = Math.round((c.totalMinutos / maxCat) * 100)
      const pctTotal = totalCatMin > 0 ? Math.round((c.totalMinutos / totalCatMin) * 100) : 0
      const color = CAT_COLORS[c.nome] ?? '#64748b'
      return `<tr>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-weight:700;font-size:8.5pt;">${escapeHtml(c.nome)}</td>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:8.5pt;text-align:right;">${escapeHtml(formatMinutos(c.totalMinutos))}</td>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:8.5pt;font-weight:700;text-align:right;color:${color};">${pctTotal}%</td>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;width:32%;">
          <div style="height:7pt;background:#e2e8f0;border-radius:2pt;overflow:hidden">
            <div style="height:100%;width:${pctBar}%;background:${color};"></div>
          </div>
        </td>
      </tr>`
    })
    .join('')

  const grupos = rankingAtividadesPorCategoriaOrdenado(kpi.rankingAtividades)
  const barsBlocks = grupos
    .map((g) => {
      const catColor = CAT_COLORS[g.titulo] ?? '#334155'
      const rows = barRowsForGroup(g.items)
      return `<div class="grafico-cat-bloco" style="margin:0 0 8pt 0;break-inside:auto;page-break-inside:auto;">
        <div class="grafico-cat-titulo" style="font-size:8.5pt;font-weight:800;letter-spacing:0.04em;color:${catColor};margin:6pt 0 4pt 0;">${escapeHtml(g.titulo)}</div>
        <table style="width:100%;border-collapse:collapse;margin:0 0 2pt 0;break-inside:auto;">${rows}</table>
      </div>`
    })
    .join('')

  const maxEv = Math.max(1, ...evolucao.map((e) => Math.max(e.minutos, e.minutosPrevistos)))
  const evRows = evolucao
    .map((e) => {
      const pctReal = Math.round((e.minutos / maxEv) * 100)
      const pctPrev = Math.round((e.minutosPrevistos / maxEv) * 100)
      return `<tr>
        <td style="padding:3pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:8pt;font-weight:700;">${escapeHtml(e.label)}</td>
        <td style="padding:3pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:7.5pt;">Real: ${escapeHtml(formatMinutos(e.minutos))}</td>
        <td style="padding:3pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:7.5pt;">Prev.: ${escapeHtml(formatMinutos(e.minutosPrevistos))}</td>
        <td style="padding:3pt 6pt;border-bottom:0.5pt solid #e2e8f0;width:28%;">
          <div style="display:flex;gap:2pt;flex-direction:column">
            <div style="height:4pt;background:#e0e7ff;border-radius:1pt"><div style="height:100%;width:${pctPrev}%;background:#94a3b8;border-radius:1pt"></div></div>
            <div style="height:4pt;background:#f1f5f9;border-radius:1pt"><div style="height:100%;width:${pctReal}%;background:#1a237e;border-radius:1pt"></div></div>
          </div>
        </td>
      </tr>`
    })
    .join('')

  const donutBlock =
    kpi.porCategoria.length === 0
      ? `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:4pt 0;">Sem dados de composição por categoria no período.</p>`
      : `<table style="width:100%;border-collapse:collapse;margin:4pt 0 10pt 0;">
          <thead><tr>
            <th style="text-align:left;font-size:7pt;color:#64748b;padding:2pt 6pt;">Categoria</th>
            <th style="text-align:right;font-size:7pt;color:#64748b;padding:2pt 6pt;">Total</th>
            <th style="text-align:right;font-size:7pt;color:#64748b;padding:2pt 6pt;">%</th>
            <th style="font-size:7pt;color:#64748b;padding:2pt 6pt;">Proporção</th>
          </tr></thead>
          <tbody>${donutRows}</tbody>
        </table>`

  const barsBlock =
    kpi.rankingAtividades.length === 0
      ? `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:4pt 0;">Sem ranking de atividades no período.</p>`
      : `<div class="grafico-barras-por-cat" style="margin:6pt 0 10pt 0;">${barsBlocks}</div>`

  const evoBlock =
    evolucao.length === 0
      ? `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:4pt 0;">Sem série mensal no intervalo.</p>`
      : `<table style="width:100%;border-collapse:collapse;margin:6pt 0 0 0;">
          <thead><tr>
            <th style="text-align:left;font-size:7pt;color:#64748b;padding:2pt 6pt;">Mês</th>
            <th style="text-align:left;font-size:7pt;color:#64748b;padding:2pt 6pt;">Horas</th>
            <th style="text-align:left;font-size:7pt;color:#64748b;padding:2pt 6pt;">Previsto</th>
            <th style="font-size:7pt;color:#64748b;padding:2pt 6pt;">Barras (prev / real)</th>
          </tr></thead>
          <tbody>${evRows}</tbody>
        </table>`

  return `
    <section class="sec-cons" aria-label="Indicadores">
      <h2 style="${secTitleCss()}">Composição por categoria (período filtrado)</h2>
      ${donutBlock}
      <h2 style="${secTitleCss()}">Atividades por volume de horas</h2>
      ${barsBlock}
      <h2 style="${secTitleCss()}">Evolução mensal (meses no intervalo)</h2>
      ${evoBlock}
    </section>`
}

export type ConsolidadoPdfModel = {
  config: ConfigRelatorioUIData
  gaepCodigo: string
  dataInicio: string
  dataFim: string
  labelCategoria: string
  labelAtividade: string
  relatorios: RelatorioLinhaConsolidado[]
  kpi: KPIData
  evolucaoMeses: EvolucaoMes[]
  fotosComLegenda: Array<{ dataUrl: string; legenda: string }>
  timbradoDataUrl: string | null
  hash: string
  qrDataUrl: string
  emitidoEm: string
  consolidadorNome: string
  rodapeTextoRenderizado: string
}

const TITULO_CONSOLIDADO = [
  'POLÍCIA PENAL FEDERAL',
  'PENITENCIÁRIA FEDERAL EM',
  'CATANDUVAS-PR',
  'GRUPO DE AÇÕES ESPECIAIS PENAIS',
] as const

export function buildConsolidadoPdfHtml(m: ConsolidadoPdfModel): string {
  const cfg = m.config
  const mrg = cfg.printMargins
  const mrgBottomNum = Number.isFinite(Number(mrg.bottom)) ? Number(mrg.bottom) : 24
  const mrgTopNum = Number.isFinite(Number(mrg.top)) ? Number(mrg.top) : 34
  const mrgLeftNum = Number.isFinite(Number(mrg.left)) ? Number(mrg.left) : 18
  const mrgRightNum = Number.isFinite(Number(mrg.right)) ? Number(mrg.right) : 14
  const footerDockBottomMm = 5
  /** Reserva para rodapé fixo (texto + QR) sem sobrepor o fluxo. */
  const conteudoPadBottomMm = Math.max(mrgBottomNum + 24, footerDockBottomMm + 38)
  /** Timbrado: reforço de topo em todas as páginas (fragmentação). */
  const conteudoPadTopMm = Math.max(mrgTopNum, 36)
  const stDesc = estiloBlocoToInlineCss(cfg.descricaoEstilo, 'corpo')

  const tituloHtml = TITULO_CONSOLIDADO.map((linha) => escapeHtml(linha)).join('<br/>')
  const subtituloTexto = `Relatório de atividades ${m.gaepCodigo}`
  const periodoFmt = `${fmtDataBr(m.dataInicio)} até ${fmtDataBr(m.dataFim)}`

  const filtrosHtml = `
    <div class="bloco-filtros" style="margin:0 0 12pt 0;padding:8pt 0;border-bottom:0.5pt solid #cbd5e1;">
      <div style="font-size:8.5pt;line-height:1.45;color:#334155;">
        <strong>Período:</strong> ${escapeHtml(periodoFmt)}<br/>
        <strong>Categoria:</strong> ${escapeHtml(m.labelCategoria)}<br/>
        <strong>Atividade:</strong> ${escapeHtml(m.labelAtividade)}
      </div>
    </div>`

  const descricoesHtml =
    m.relatorios.length === 0
      ? `<p class="corpo-descricao-atividade" style="${stDesc};color:#64748b;font-style:italic;">Nenhum registro encontrado para os filtros selecionados.</p>`
      : m.relatorios
          .map((r) => {
            const cat = r.categoriaNome ?? '—'
            const atv = r.atividadeNome ?? '—'
            const relNome = r.relatoristaNome?.trim() || 'Não informado'
            const ocorrBlock = r.ocorrencias?.trim()
              ? `<div style="margin-top:5pt;padding:5pt 8pt;background:rgba(254,240,138,0.4);border-left:2pt solid #eab308;border-radius:4pt;font-size:8.5pt;line-height:1.35;color:#78350f;">
                  <strong>⚠️ Ocorrências:</strong> ${escapeHtml(r.ocorrencias!.trim())}
                </div>`
              : ''
            return `<div class="descricao-item">
          <div class="descricao-meta">${escapeHtml(fmtDataBr(r.data))} · ${escapeHtml(cat)} · ${escapeHtml(atv)}</div>
          <p class="descricao-texto corpo-descricao-atividade" style="${stDesc}">
            <span class="descricao-corpo-pre">${escapeHtml(r.descricao_revisada)}</span><span class="relatorista-inline"> Relatorista: ${escapeHtml(relNome)}</span>
          </p>
          ${ocorrBlock}
        </div>`
          })
          .join('')

  const chartsHtml = buildChartsHtml(m.kpi, m.evolucaoMeses)

  const fotosItems = m.fotosComLegenda
    .map((f) => {
      const src = imgSrcForPdf(f.dataUrl)
      if (!src) return ''
      return `<div class="foto-item">
        <div class="foto-legenda">${escapeHtml(f.legenda)}</div>
        <div class="foto-box">
          <img src="${src}" alt="" onerror="this.style.display='none'" />
        </div>
      </div>`
    })
    .join('')

  const fotosSec =
    m.fotosComLegenda.length === 0
      ? ''
      : `<section class="sec-cons sec-fotos-consolidado" aria-label="Fotos">
      <h2 style="${secTitleCss()}">Registros fotográficos do período</h2>
      <div class="fotos-grid">${fotosItems}</div>
    </section>`

  const timbradoHtml = m.timbradoDataUrl
    ? `<img class="timbrado" src="${imgSrcForPdf(m.timbradoDataUrl)}" alt="" />`
    : ''

  const rodExtra =
    m.rodapeTextoRenderizado && m.rodapeTextoRenderizado.trim() !== m.gaepCodigo.trim()
      ? ` · ${escapeHtml(m.rodapeTextoRenderizado.trim())}`
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Consolidado GAEP</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; width: 210mm; min-height: 297mm; max-width: 210mm;
      overflow-x: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    img.timbrado {
      position: fixed; top: 0; left: 0; width: 210mm; min-width: 210mm; height: 297mm; min-height: 297mm;
      object-fit: fill; object-position: center top; z-index: 0; pointer-events: none;
    }
    .conteudo {
      position: relative; z-index: 1;
      padding: ${conteudoPadTopMm}mm ${mrgRightNum}mm ${conteudoPadBottomMm}mm ${mrgLeftNum}mm;
      min-height: auto; width: 100%; max-width: 100%; box-sizing: border-box;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }
    .fluxo-principal { padding-bottom: 1mm; }
    .cabecalho-bloco {
      display: grid; grid-template-columns: minmax(0, 1fr) 32mm; column-gap: 4mm; align-items: start;
      margin: 0 0 10pt 0; padding-top: 2pt;
    }
    .cabecalho-texto { min-width: 0; max-width: 100%; }
    .cabecalho-reserva { min-height: 24mm; pointer-events: none; }
    h1.cabecalho-titulo {
      margin: 0; padding: 0; text-align: center; font-size: 11.5pt !important; line-height: 1.2 !important;
      font-weight: 800 !important; letter-spacing: 0.04em !important; text-transform: uppercase; color: #0f172a;
    }
    h2.subtitulo {
      margin: 8pt 0 0 0; padding: 0 0 7pt 0; border-bottom: 1.25pt solid #334155; min-height: 1.05em;
      text-align: center; font-size: 10pt !important; font-weight: 700 !important; color: #1e293b;
    }
    .sec-cons { break-inside: auto; page-break-inside: auto; }
    .grafico-cat-titulo { break-after: avoid; page-break-after: avoid; }
    .descricao-item {
      margin-bottom: 8pt; padding-bottom: 6pt; border-bottom: 1px solid rgba(15, 23, 42, 0.10);
      break-inside: auto; page-break-inside: auto;
    }
    .descricao-meta {
      font-size: 8px; font-weight: 700; color: rgba(15, 23, 42, 0.70); margin-bottom: 2pt;
    }
    .descricao-texto.corpo-descricao-atividade,
    .descricao-texto {
      margin: 0; padding: 0; font-size: 10px; line-height: 1.35; color: #0f172a;
      overflow-wrap: break-word; word-wrap: break-word; white-space: normal;
      text-align: justify; text-indent: 1.5em;
      orphans: 2; widows: 2;
    }
    .descricao-corpo-pre {
      white-space: pre-line; overflow-wrap: break-word; word-wrap: break-word;
    }
    .relatorista-inline {
      font-size: 8px; font-style: italic; color: rgba(0, 0, 0, 0.5); margin-left: 4px;
      text-indent: 0;
    }
    .corpo-descricao-atividade {
      word-wrap: break-word; overflow-wrap: break-word;
    }
    .sec-fotos-consolidado { break-inside: auto; page-break-inside: auto; }
    .fotos-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 10mm; row-gap: 8mm; margin-top: 6pt;
    }
    .foto-item {
      break-inside: avoid; page-break-inside: avoid;
    }
    .foto-legenda {
      font-size: 8px; font-weight: 700; color: rgba(15, 23, 42, 0.70); margin-bottom: 3px;
    }
    .foto-box {
      height: 52mm; display: flex; align-items: center; justify-content: center;
      overflow: hidden; background: transparent;
    }
    .foto-box img {
      max-width: 100%; max-height: 100%; object-fit: contain; display: block;
    }
    .rodape-fixo {
      position: fixed; left: ${mrgLeftNum}mm; right: ${mrgRightNum}mm; bottom: ${footerDockBottomMm}mm; z-index: 20;
      min-height: 17mm; margin: 0; padding: 0; border: none; border-top: 0.35pt solid rgba(255,255,255,0.2);
      display: flex; align-items: flex-end; justify-content: space-between; gap: 3mm;
      color: rgba(255,255,255,0.88); font-size: 7.5pt; line-height: 1.35;
      break-inside: avoid; page-break-inside: avoid;
    }
    body.pdf-sem-timbrado .rodape-fixo {
      color: rgba(0,0,0,0.55); border-top: 0.35pt solid rgba(15,23,42,0.15);
    }
    .rodape-info { flex: 1 1 auto; min-width: 0; max-width: calc(100% - 58px - 3mm); word-break: break-word; }
    .rodape-info strong { color: rgba(255,255,255,0.96); font-weight: 700; }
    body.pdf-sem-timbrado .rodape-info strong { color: rgba(0,0,0,0.72); }
    .rodape-fixo .qr {
      width: 54px; height: 54px; flex: 0 0 auto; object-fit: contain; display: block; padding: 2px;
      background: #fff; border-radius: 2px; box-sizing: content-box;
    }
  </style>
</head>
<body class="${m.timbradoDataUrl ? 'pdf-com-timbrado' : 'pdf-sem-timbrado'}">
  ${timbradoHtml}
  <main class="conteudo">
    <div class="fluxo-principal">
      <header class="cabecalho-bloco">
        <div class="cabecalho-texto">
          <h1 class="cabecalho-titulo">${tituloHtml}</h1>
          <h2 class="subtitulo">${escapeHtml(subtituloTexto)}</h2>
        </div>
        <div class="cabecalho-reserva" aria-hidden="true"></div>
      </header>
      ${filtrosHtml}
      <section class="sec-cons" aria-label="Descrições">
        <h2 style="${secTitleCss()}">Descrições do período</h2>
        ${descricoesHtml}
      </section>
      ${chartsHtml}
      ${fotosSec}
    </div>
  </main>
  <footer class="rodape-fixo" role="contentinfo">
    <div class="rodape-info">
      <div><strong>Consolidado por:</strong> ${escapeHtml(m.consolidadorNome.trim() || 'Não informado')}</div>
      <div><strong>Autenticidade:</strong> ${escapeHtml(m.hash)}</div>
      <div>Gerado em: ${escapeHtml(m.emitidoEm)} · Consolidado · ${escapeHtml(m.gaepCodigo)}${rodExtra}</div>
    </div>
    <img class="qr" src="${imgSrcForPdf(m.qrDataUrl)}" alt="QR" width="54" height="54" />
  </footer>
</body>
</html>`
}
