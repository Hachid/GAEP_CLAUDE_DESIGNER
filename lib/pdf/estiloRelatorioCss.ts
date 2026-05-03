import type { EstiloBlocoRelatorio } from '@/app/(app)/gestao/GestaoClient'

function fontFamilyCss(cssName: string): string {
  const x = cssName.trim().toLowerCase()
  if (x.includes('times') || x.includes('serif')) return '"Times New Roman", Times, serif'
  if (x.includes('courier') || x.includes('mono')) return 'Courier, "Courier New", monospace'
  return 'Helvetica, Arial, sans-serif'
}

/**
 * Converte estilo da Gestão em declarações CSS inline (espelha `PreviewRelatorio` em GestaoClient).
 * `indent` usa **px** como no preview (`marginLeft: Npx`).
 */
export function estiloBlocoToInlineCss(
  e: EstiloBlocoRelatorio,
  preset: 'titulo' | 'subtitulo' | 'corpo'
): string {
  const fontWeight =
    preset === 'titulo'
      ? e.bold === false
        ? '400'
        : '700'
      : preset === 'subtitulo'
        ? e.bold
          ? '700'
          : '400'
        : e.bold
          ? '700'
          : '400'

  const parts: string[] = [
    `font-family:${fontFamilyCss(e.fontFamily)}`,
    `color:${e.fontColor}`,
    `text-align:${e.align}`,
    `line-height:${e.lineHeight}`,
    `font-size:${e.fontSize ?? 11}pt`,
    `font-weight:${fontWeight}`,
    `font-style:${e.italic ? 'italic' : 'normal'}`,
    `text-decoration:${e.underline ? 'underline' : 'none'}`,
  ]
  if (e.indent) parts.push(`padding-left:${e.indent}px`)
  if (e.marginTop != null) parts.push(`margin-top:${e.marginTop}mm`)
  if (e.marginBottom != null) parts.push(`margin-bottom:${e.marginBottom}mm`)
  return parts.join(';')
}
