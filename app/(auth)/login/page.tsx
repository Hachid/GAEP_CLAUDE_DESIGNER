import { createAdminClient } from '@/lib/supabase/admin'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const supabase = createAdminClient()
  const { data: operadoresData } = await supabase
    .from('operadores')
    .select('id, nome, matricula')
    .is('deleted_at', null)
    .eq('ativo', true)
    .order('nome')

  // Lista apenas operadores já cadastrados no domínio da aplicação.
  // Isso evita autenticar usuários do Auth sem vínculo em `operadores`,
  // que depois quebrariam na página de relatório.
  const operadores = (operadoresData ?? [])
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
    .sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    )

  return <LoginForm operadores={operadores} />
}
