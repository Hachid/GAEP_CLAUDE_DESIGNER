import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/signout
 *
 * Encerra a sessão do usuário e redireciona para /login.
 * Usado pelo formulário de logout da tela de "operador não configurado".
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
