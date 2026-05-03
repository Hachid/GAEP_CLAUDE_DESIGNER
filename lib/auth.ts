import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** Returns the authenticated user or throws if the session is missing/expired. */
export async function getSessionOrThrow(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return user
}
