import { createHash } from 'node:crypto'

/**
 * Hash e payload de QR para autenticidade do relatório (modelo GAEP-CAT).
 * O timestamp fixo vem do banco (`created_at`) para o digest permanecer estável.
 */
export function relatorioIntegrityParts(input: {
  id: string
  dataAtividade: string
  descricaoFinal: string
  createdAtIso: string
}): { hash: string; qrPayload: string } {
  const payload = `${input.id}|${input.dataAtividade}|${input.descricaoFinal}|${input.createdAtIso}`
  const hash = createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16).toUpperCase()
  const qrPayload = `GAEP-CAT|ID:${input.id}|DATA:${input.dataAtividade}|HASH:${hash}`
  return { hash, qrPayload }
}

/** Converte margens em mm (Gestão / impressão) para pontos (72 pt/in). */
export function marginsMmToPt(m: { top: number; right: number; bottom: number; left: number }): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const k = 72 / 25.4
  return {
    top: m.top * k,
    right: m.right * k,
    bottom: m.bottom * k,
    left: m.left * k,
  }
}

/** Margens padrão do modelo novo (equivalente a ~98/78/36/68 pt no A4). */
export const DEFAULT_PRINT_MARGINS_MM = {
  top: (98 * 25.4) / 72,
  left: (78 * 25.4) / 72,
  right: (36 * 25.4) / 72,
  bottom: (68 * 25.4) / 72,
}
