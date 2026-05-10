import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isStaleAuthSessionError, supabaseAuthCookieNamesFromList } from '@/lib/supabase/stale-session'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function supabasePublicEnvOk(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

export default async function LoginPage() {
  if (!supabasePublicEnvOk()) {
    return (
      <LoginForm avisoAmbiente="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no painel da Vercel (Settings → Environment Variables), incluindo o ambiente Production, e faça um novo deploy." />
    )
  }

  const authClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (user) {
    redirect('/relatorio')
  }

  if (isStaleAuthSessionError(authError)) {
    const cookieStore = await cookies()
    for (const name of supabaseAuthCookieNamesFromList(cookieStore.getAll())) {
      cookieStore.delete(name)
    }
  }

  return <LoginForm />
}
