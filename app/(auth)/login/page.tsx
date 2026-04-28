import { createAdminClient } from '@/lib/supabase/admin'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const supabase = createAdminClient()
  const { data: operadoresData } = await supabase
    .from('operadores')
    .select('id, nome_guerra, matricula')
    .is('deleted_at', null)
    .eq('ativo', true)
    .order('nome_guerra')

  const { data: authUsersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  const operadoresByMatricula = new Map<string, { id: string; nome: string; matricula: string }>()

  for (const op of operadoresData ?? []) {
    const matricula = String(op.matricula ?? '').trim()
    if (!matricula) continue

    operadoresByMatricula.set(matricula, {
      id: String(op.id),
      nome: String(op.nome_guerra ?? matricula),
      matricula,
    })
  }

  for (const user of authUsersData?.users ?? []) {
    const email = user.email?.trim().toLowerCase()
    if (!email || !email.endsWith('@gaep.internal')) continue

    const matricula = email.replace('@gaep.internal', '')
    if (!matricula || operadoresByMatricula.has(matricula)) continue

    operadoresByMatricula.set(matricula, {
      id: user.id,
      nome: matricula,
      matricula,
    })
  }

  const operadores = Array.from(operadoresByMatricula.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )

  return <LoginForm operadores={operadores} />
}
