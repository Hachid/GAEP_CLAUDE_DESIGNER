import { describe, it, expect } from 'vitest'
import { validateNovaSenhaGaep } from '@/lib/password-policy'

describe('validateNovaSenhaGaep', () => {
  it('aceita senha com maiúscula e número', () => {
    expect(validateNovaSenhaGaep('Abcd1234')).toEqual({ ok: true })
  })

  it('aceita senha com maiúscula e caractere especial', () => {
    expect(validateNovaSenhaGaep('Abcd-efgh')).toEqual({ ok: true })
  })

  it('rejeita sem maiúscula', () => {
    const r = validateNovaSenhaGaep('abcdef12')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/maiúscula/i)
  })

  it('rejeita curta', () => {
    const r = validateNovaSenhaGaep('Aa1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/8/)
  })

  it('rejeita só letras com maiúscula', () => {
    const r = validateNovaSenhaGaep('Abcdefgh')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/número|especial/i)
  })
})
