export const SUPABASE_SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 180

export const supabaseCookieOptions = {
  name: 'sb-gaep-auth',
  lifetime: SUPABASE_SESSION_LIFETIME_SECONDS,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}
