import type { KPIData, AtividadeStat } from '@/app/(app)/dashboard/types'
import type { FolhaDia } from '@/app/(app)/operadores/types'
import { escapeHtml } from '@/lib/pdf/escapeHtml'
import { formatMinutos, CAT_COLORS, CAT_ORDER } from '@/app/(app)/dashboard/utils'

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

function buildCompositionAndRankingHtml(kpi: KPIData): string {
  const maxCat = Math.max(1, ...kpi.porCategoria.map((c) => c.totalMinutos))
  const donutRows = kpi.porCategoria
    .map((c) => {
      const pct = Math.round((c.totalMinutos / maxCat) * 100)
      const color = CAT_COLORS[c.nome] ?? '#64748b'
      return `<tr>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-weight:700;font-size:8.5pt;">${escapeHtml(c.nome)}</td>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;font-size:8.5pt;text-align:right;">${escapeHtml(formatMinutos(c.totalMinutos))}</td>
        <td style="padding:4pt 6pt;border-bottom:0.5pt solid #e2e8f0;width:38%;">
          <div style="height:7pt;background:#e2e8f0;border-radius:2pt;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};"></div>
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
      const titulo =
        g.titulo.length > 0
          ? `${g.titulo.charAt(0)}${g.titulo.slice(1).toLowerCase()}`
          : g.titulo
      return `<div style="margin:0 0 8pt 0;break-inside:auto;page-break-inside:auto;">
        <div style="font-size:8.5pt;font-weight:800;letter-spacing:0.04em;color:${catColor};margin:6pt 0 4pt 0;text-align:center;border-bottom:0.5pt solid #e2e8f0;padding-bottom:3pt;">Ranking: ${escapeHtml(titulo)}</div>
        <table style="width:100%;border-collapse:collapse;margin:0 0 2pt 0;break-inside:auto;">${rows}</table>
      </div>`
    })
    .join('')

  const donutBlock =
    kpi.porCategoria.length === 0
      ? `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:4pt 0;">Sem dados de composição por categoria no período.</p>`
      : `<table style="width:100%;border-collapse:collapse;margin:4pt 0 10pt 0;">
          <thead><tr>
            <th style="text-align:left;font-size:7pt;color:#64748b;padding:2pt 6pt;">Categoria</th>
            <th style="text-align:right;font-size:7pt;color:#64748b;padding:2pt 6pt;">Total</th>
            <th style="font-size:7pt;color:#64748b;padding:2pt 6pt;">Proporção</th>
          </tr></thead>
          <tbody>${donutRows}</tbody>
        </table>`

  const barsBlock =
    kpi.rankingAtividades.length === 0
      ? `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:4pt 0;">Sem ranking de atividades no período.</p>`
      : `<div style="margin:6pt 0 10pt 0;">${barsBlocks}</div>`

  return `
    <section aria-label="Gráficos">
      <h2 style="${secTitleCss()}">Composição por categoria</h2>
      ${donutBlock}
      <h2 style="${secTitleCss()}">Ranking por categoria</h2>
      ${barsBlock}
    </section>`
}

function buildFolhaTableHtml(folha: FolhaDia[], totalMinutos: number): string {
  if (folha.length === 0) {
    return `<p style="font-size:8.5pt;color:#64748b;font-style:italic;margin:8pt 0;">Sem registros no período.</p>`
  }

  const body = folha
    .map((dia, di) => {
      const linhasDia = dia.rows
        .map(
          (r, ri) => {
            const isP = r.plantao && r.dataFimFormatada
            const rowBg = isP ? 'background:rgba(124,58,237,0.05);border-left:2pt solid #7c3aed;' : ''
            return `<tr style="border-bottom:0.5pt solid #f1f5f9;${rowBg}">
          <td style="padding:4pt 4pt;font-size:8pt;font-weight:700;color:#1a237e;white-space:nowrap;">${ri === 0 ? escapeHtml(dia.dataFormatada) : ''}</td>
          <td style="padding:4pt 4pt;font-size:7.9pt;font-weight:600;color:${isP ? '#7c3aed' : '#334155'};">${isP ? '🌙 ' : ''}${escapeHtml(r.atividade)}</td>
          <td style="padding:4pt 4pt;text-align:center;font-size:8pt;color:#475569;">${escapeHtml(r.inicio)}</td>
          <td style="padding:4pt 4pt;text-align:center;font-size:8pt;color:#475569;">${escapeHtml(r.fim)}${isP ? `<span style="font-size:6.5pt;color:#7c3aed;"> (${escapeHtml(r.dataFimFormatada!)})</span>` : ''}</td>
          <td style="padding:4pt 4pt;text-align:center;font-size:8pt;font-weight:700;color:${isP ? '#7c3aed' : '#475569'};">${escapeHtml(formatMinutos(r.totalMinutos))}</td>
        </tr>`
          }
        )
        .join('')

      const subtotal = `<tr style="background:rgba(249,115,22,0.08);">
        <td colspan="4" style="padding:4pt 6pt;text-align:right;font-size:7.8pt;font-weight:700;color:#64748b;">TOTAL DO DIA:</td>
        <td style="padding:4pt 4pt;text-align:center;font-size:8.5pt;font-weight:800;color:#f97316;">${escapeHtml(formatMinutos(dia.totalMinutos))}</td>
      </tr>`

      const spacer =
        di < folha.length - 1 ? `<tr><td colspan="5" style="height:4pt;"></td></tr>` : ''

      return linhasDia + subtotal + spacer
    })
    .join('')

  return `<table style="width:100%;border-collapse:collapse;font-size:8pt;margin:6pt 0 0 0;">
    <thead>
      <tr style="border-bottom:1pt solid #e2e8f0;color:#64748b;">
        <th style="padding:5pt 4pt;text-align:left;font-weight:700;">Data</th>
        <th style="padding:5pt 4pt;text-align:left;font-weight:700;">Atividade</th>
        <th style="padding:5pt 4pt;text-align:center;font-weight:700;">Início</th>
        <th style="padding:5pt 4pt;text-align:center;font-weight:700;">Fim</th>
        <th style="padding:5pt 4pt;text-align:center;font-weight:700;">Total</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr style="border-top:1pt solid #1a237e;background:rgba(26,35,126,0.06);font-weight:700;color:#1a237e;">
        <td colspan="4" style="padding:8pt 6pt;text-align:right;font-size:9pt;">TOTAL GERAL:</td>
        <td style="padding:8pt 4pt;text-align:center;font-size:9.5pt;">${escapeHtml(formatMinutos(totalMinutos))}</td>
      </tr>
    </tfoot>
  </table>`
}

export type DesempenhoOperadorPdfModel = {
  operadorNome: string
  gaepCodigo: string
  dataInicio: string
  dataFim: string
  kpi: KPIData
  folha: FolhaDia[]
  emitidoEm: string
}

export function buildDesempenhoOperadorPdfHtml(m: DesempenhoOperadorPdfModel): string {
  const periodoFmt = `${fmtDataBr(m.dataInicio)} até ${fmtDataBr(m.dataFim)}`
  const kpiCards = `
    <div style="display:table;width:100%;table-layout:fixed;border-spacing:8pt 0;margin:0 0 10pt 0;">
      <div style="display:table-row;">
        <div style="display:table-cell;width:50%;vertical-align:top;border:0.5pt solid #e2e8f0;border-top:3pt solid #1a237e;border-radius:6pt;padding:10pt 8pt;text-align:center;background:#fff;">
          <div style="font-size:7pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Total de missões</div>
          <div style="font-size:20pt;font-weight:800;color:#1e293b;margin-top:4pt;">${m.kpi.totalRegistros}</div>
        </div>
        <div style="display:table-cell;width:50%;vertical-align:top;border:0.5pt solid #e2e8f0;border-top:3pt solid #f97316;border-radius:6pt;padding:10pt 8pt;text-align:center;background:#fff;">
          <div style="font-size:7pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Carga horária total</div>
          <div style="font-size:20pt;font-weight:800;color:#f97316;margin-top:4pt;">${escapeHtml(formatMinutos(m.kpi.totalMinutos))}</div>
        </div>
      </div>
    </div>`

  const folhaSec = `
    <section style="margin:0 0 12pt 0;break-inside:auto;">
      <h2 style="${secTitleCss()}">Quadro de horários (folha ponto)</h2>
      ${buildFolhaTableHtml(m.folha, m.kpi.totalMinutos)}
    </section>`

  const charts = buildCompositionAndRankingHtml(m.kpi)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Desempenho — ${escapeHtml(m.operadorNome)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 12pt; font-weight: 800; color: #1a237e; margin: 0 0 4pt 0; }
    .meta { font-size: 8.5pt; color: #475569; line-height: 1.5; margin: 0 0 10pt 0; }
  </style>
</head>
<body>
  <h1>Desempenho individual</h1>
  <div class="meta">
    <strong>Operador:</strong> ${escapeHtml(m.operadorNome)}<br/>
    <strong>GAEP:</strong> ${escapeHtml(m.gaepCodigo)}<br/>
    <strong>Período:</strong> ${escapeHtml(periodoFmt)}
  </div>
  ${kpiCards}
  ${folhaSec}
  ${charts}
  <p style="margin-top:14pt;padding-top:8pt;border-top:0.5pt solid #e2e8f0;font-size:7pt;color:#64748b;text-align:center;">
    Emitido em ${escapeHtml(m.emitidoEm)} · ${escapeHtml(m.gaepCodigo)}
  </p>
</body>
</html>`
}
