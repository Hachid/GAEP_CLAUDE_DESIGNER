import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

/** Erros em que os cookies de auth devem ser descartados (evita loop de refresh inválido). */
export function isStaleAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  if (e.code === 'refresh_token_not_found') return true
  const msg = String(e.message ?? '').toLowerCase()
  if (msg.includes('refresh token') && msg.includes('invalid')) return true
  if (msg.includes('refresh token not found')) return true
  return false
}

/** Nomes de cookies usados pelo @supabase/ssr com `cookieOptions.name` (inclui chunks `.0`, `.1`, …). */
export function supabaseAuthCookieNamesFromList(
  cookies: ReadonlyArray<{ name: string }>
): string[] {
  const key = supabaseCookieOptions.name
  return cookies.map((c) => c.name).filter((name) => name === key || name.startsWith(`${key}.`))
}
