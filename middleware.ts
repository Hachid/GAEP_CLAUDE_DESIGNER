import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

const PUBLIC_PATHS = ['/login', '/convite']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Server Actions already validate auth in the action itself.
  // Skipping middleware auth here avoids hanging POSTs when auth fetch is unstable.
  if (request.method === 'POST' && request.headers.has('next-action')) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      )
    },
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    { cookies: cookieMethods, cookieOptions: supabaseCookieOptions }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|gaep-logo.png).*)'],
}
