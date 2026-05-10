import { describe, it, expect } from 'vitest'
import { isStaleAuthSessionError, supabaseAuthCookieNamesFromList } from '@/lib/supabase/stale-session'

describe('isStaleAuthSessionError', () => {
  it('detecta refresh_token_not_found', () => {
    expect(isStaleAuthSessionError({ code: 'refresh_token_not_found', message: 'x' })).toBe(true)
  })

  it('detecta mensagem Invalid Refresh Token', () => {
    expect(
      isStaleAuthSessionError({
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      })
    ).toBe(true)
  })

  it('ignora erro desconhecido', () => {
    expect(isStaleAuthSessionError({ code: 'other', message: 'nope' })).toBe(false)
    expect(isStaleAuthSessionError(null)).toBe(false)
  })
})

describe('supabaseAuthCookieNamesFromList', () => {
  it('filtra cookies sb-gaep-auth e chunks', () => {
    const names = supabaseAuthCookieNamesFromList([
      { name: 'other' },
      { name: 'sb-gaep-auth' },
      { name: 'sb-gaep-auth.0' },
    ])
    expect(names).toEqual(['sb-gaep-auth', 'sb-gaep-auth.0'])
  })
})
