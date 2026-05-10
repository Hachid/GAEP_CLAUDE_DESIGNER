/** Texto exibido junto ao campo de nova senha (Dados Pessoais / convites). */
export const LEGENDA_REQUISITOS_SENHA_GAEP =
  'Mínimo de 8 caracteres; pelo menos 1 letra maiúscula; e pelo menos 1 número ou 1 caractere especial.'

export type NovaSenhaValidation = { ok: true } | { ok: false; message: string }

/** Regra: ≥8 caracteres, ≥1 maiúscula, e (≥1 dígito OU ≥1 caractere não alfanumérico). */
export function validateNovaSenhaGaep(senha: string): NovaSenhaValidation {
  const s = senha.trim()
  if (s.length < 8) {
    return { ok: false, message: 'A nova senha deve ter no mínimo 8 caracteres.' }
  }
  if (!/[A-Z]/.test(s)) {
    return { ok: false, message: 'Inclua pelo menos uma letra maiúscula (A–Z).' }
  }
  const temNumero = /\d/.test(s)
  const temEspecial = /[^A-Za-z0-9]/.test(s)
  if (!temNumero && !temEspecial) {
    return {
      ok: false,
      message: 'Inclua pelo menos um número ou um caractere especial.',
    }
  }
  return { ok: true }
}
