import { createAdminClient } from '@/lib/supabase/admin'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const supabase = createAdminClient()

  // A tabela `operadores` expõe `nome` (não existe coluna física `nome_guerra`).
  // Outras páginas usam o alias PostgREST `nome_guerra:nome`; aqui basta `nome`.
  const { data: rows, error } = await supabase
    .from('operadores')
    .select('id, nome, matricula')
    .is('deleted_at', null)
    .eq('ativo', true)
    .order('nome')

  if (error) {
    console.error('[LoginPage] Erro ao buscar operadores:', error.message)
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

  return <LoginForm operadores={operadores} />
}
