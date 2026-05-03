import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import {
  DEFAULT_TITULO_RELATORIO_INSTITUCIONAL,
  resolveTituloRelatorioFromDb,
} from '@/lib/pdf/defaultTituloRelatorio'
import { DEFAULT_PRINT_MARGINS_MM } from '@/lib/pdf/relatorioIntegrity'

/** Aceita número ou string com vírgula (ex.: margens digitadas em pt-BR). */
export function mmField(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/**
 * Monta `ConfigRelatorioUIData` a partir da linha `config_relatorio` do Supabase.
 * Mesma lógica da página de detalhe do relatório e do preview em Gestão (WYSIWYG).
 */
export function configRelatorioFromRow(row: Record<string, unknown> | null): ConfigRelatorioUIData {
  if (!row) {
    return {
      id: null,
      tituloTexto: DEFAULT_TITULO_RELATORIO_INSTITUCIONAL,
      subtituloTexto: '',
      descricaoTexto: '',
      rodapeTexto: '{{GAEP}}',
      timbradoUrl: null,
      tituloEstilo: {
        fontFamily: 'Times New Roman',
        fontColor: '#000000',
        align: 'center',
        indent: 0,
        lineHeight: 1.4,
        fontSize: 12,
      },
      subtituloEstilo: {
        fontFamily: 'Times New Roman',
        fontColor: '#000000',
        align: 'center',
        indent: 0,
        lineHeight: 1.3,
        fontSize: 11,
      },
      descricaoEstilo: {
        fontFamily: 'Times New Roman',
        fontColor: '#111827',
        align: 'justify',
        indent: 12,
        lineHeight: 1.8,
        fontSize: 11,
      },
      rodapeEstilo: {
        fontFamily: 'Times New Roman',
        fontColor: '#6b7280',
        align: 'right',
        indent: 0,
        lineHeight: 1.3,
        fontSize: 8,
      },
      printMargins: { ...DEFAULT_PRINT_MARGINS_MM },
    }
  }

  const layout = row.layout_pdf as
    | { margins?: { top?: unknown; right?: unknown; bottom?: unknown; left?: unknown } }
    | undefined
  const m = layout?.margins

  return {
    id: row.id != null ? String(row.id) : null,
    tituloTexto: resolveTituloRelatorioFromDb(row.titulo_texto as string | null | undefined),
    subtituloTexto: String(row.subtitulo_texto ?? ''),
    descricaoTexto: String(row.descricao_texto ?? ''),
    rodapeTexto: String(row.rodape_texto ?? '{{GAEP}}'),
    timbradoUrl: row.timbrado_url ? String(row.timbrado_url) : null,
    tituloEstilo: {
      fontFamily: 'Times New Roman',
      fontColor: '#000000',
      align: 'center',
      indent: 0,
      lineHeight: 1.4,
      fontSize: 12,
      ...(row.titulo_estilo as Record<string, unknown>),
    } as ConfigRelatorioUIData['tituloEstilo'],
    subtituloEstilo: {
      fontFamily: 'Times New Roman',
      fontColor: '#000000',
      align: 'center',
      indent: 0,
      lineHeight: 1.3,
      fontSize: 11,
      ...(row.subtitulo_estilo as Record<string, unknown>),
    } as ConfigRelatorioUIData['subtituloEstilo'],
    descricaoEstilo: {
      fontFamily: 'Times New Roman',
      fontColor: '#111827',
      align: 'justify',
      indent: 12,
      lineHeight: 1.8,
      fontSize: 11,
      ...(row.descricao_estilo as Record<string, unknown>),
    } as ConfigRelatorioUIData['descricaoEstilo'],
    rodapeEstilo: {
      fontFamily: 'Times New Roman',
      fontColor: '#6b7280',
      align: 'right',
      indent: 0,
      lineHeight: 1.3,
      fontSize: 8,
      ...(row.rodape_estilo as Record<string, unknown>),
    } as ConfigRelatorioUIData['rodapeEstilo'],
    printMargins: {
      top: mmField(m?.top, DEFAULT_PRINT_MARGINS_MM.top),
      right: mmField(m?.right, DEFAULT_PRINT_MARGINS_MM.right),
      bottom: mmField(m?.bottom, DEFAULT_PRINT_MARGINS_MM.bottom),
      left: mmField(m?.left, DEFAULT_PRINT_MARGINS_MM.left),
    },
  }
}
