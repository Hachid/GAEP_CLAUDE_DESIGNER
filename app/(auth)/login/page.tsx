import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function supabasePublicEnvOk(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

type OperadorRow = {
  id: string | number | null
  nome: string | null
  matricula: string | number | null
}

async function fetchOperadoresComRetry(maxTentativas = 3) {
  let lastError: unknown = null

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
      try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
          .from('operadores')
          .select('id, nome, matricula')
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          throw error
        }

        return { rows: (data ?? []) as OperadorRow[], errorMessage: null as string | null }
      } catch (error) {
        lastError = error
        if (tentativa < maxTentativas) {
          const delayMs = tentativa * 300
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }
  }

  const adminErrorMessage: string | null =
    lastError instanceof Error ? lastError.message : lastError != null ? 'Erro desconhecido' : null

  // Fallback: tenta leitura com client SSR (anon/autenticado), útil quando a chave service role falhar.
  try {
    const client = await createClient()
    const { data, error } = await client
      .from('operadores')
      .select('id, nome, matricula')
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome')

    if (!error && data) {
      return { rows: data as OperadorRow[], errorMessage: null as string | null }
    }
  } catch {
    // Mantém o erro original da etapa principal.
  }

  return { rows: [] as OperadorRow[], errorMessage: adminErrorMessage }
}

export default async function LoginPage() {
  if (!supabasePublicEnvOk()) {
    return (
      <LoginForm
        operadores={[]}
        carregamentoComErro={false}
        avisoAmbiente="Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no painel da Vercel (Settings → Environment Variables), incluindo o ambiente Production, e faça um novo deploy."
      />
    )
  }

  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (user) {
    redirect('/relatorio')
  }

  const { rows, errorMessage } = await fetchOperadoresComRetry()

  if (errorMessage) {
    console.error('[LoginPage] Erro ao buscar operadores:', errorMessage)
  }

  const operadores = (rows ?? [])
    .map((op) => {
      const matricula = String(op.matricula ?? '').trim()
      if (!matricula) return null
      return {
        id: String(op.id),
        nome: String(op.nome ?? matricula),
        matricula,
      }
    })
    .filter((op): op is { id: string; nome: string; matricula: string } => op !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))

  return <LoginForm operadores={operadores} carregamentoComErro={Boolean(errorMessage)} />
}
