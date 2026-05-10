import { describe, it, expect } from 'vitest'
import { emailSistemaFromMatricula } from '@/lib/email-sistema'

describe('emailSistemaFromMatricula', () => {
  it('monta e-mail interno a partir da matrícula', () => {
    expect(emailSistemaFromMatricula(' 01342 ')).toBe('01342@gaep.internal')
  })
})
