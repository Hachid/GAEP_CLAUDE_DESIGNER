/** Título institucional padrão do cabeçalho (três linhas, como no timbrado oficial). */
export const DEFAULT_TITULO_RELATORIO_INSTITUCIONAL =
  'POLÍCIA PENAL FEDERAL PENITENCIÁRIA\nFEDERAL EM CATANDUVAS-PR GRUPO DE\nAÇÕES ESPECIAIS PENAIS-CATANDUVAS'

const LEGACY_TITULO_PADRAO = 'RELATÓRIO OPERACIONAL'

/** Normaliza título vindo do banco: vazio ou legado vira o texto institucional padrão. */
export function resolveTituloRelatorioFromDb(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed || trimmed === LEGACY_TITULO_PADRAO) {
    return DEFAULT_TITULO_RELATORIO_INSTITUCIONAL
  }
  return String(raw ?? '')
}
