import { createHash } from 'node:crypto'

/**
 * Hash e payload de QR para PDF consolidado (mesmo espírito do relatório individual).
 */
export function consolidadoIntegrityParts(input: {
  /** Um id ou vários (chave estável), inclusive escopo multi-GAEP. */
  gaepScopeKey: string
  dataInicio: string
  dataFim: string
  categoriaId: string
  atividadeId: string
  relatorioIdsOrdenados: string[]
  emitidoAtIso: string
  consolidadorNome: string
}): { hash: string; qrPayload: string } {
  const ids = [...input.relatorioIdsOrdenados].sort().join(',')
  const payload = [
    input.gaepScopeKey,
    input.dataInicio,
    input.dataFim,
    input.categoriaId,
    input.atividadeId,
    ids,
    input.emitidoAtIso,
    input.consolidadorNome.trim(),
  ].join('|')
  const hash = createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16).toUpperCase()
  const qrPayload = `GAEP-CAT|CONSOLIDADO|GAEP:${input.gaepScopeKey}|PER:${input.dataInicio}–${input.dataFim}|HASH:${hash}`
  return { hash, qrPayload }
}
