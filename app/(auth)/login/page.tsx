import { createAdminClient } from '@/lib/supabase/admin'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const supabase = createAdminClient()
  let operadoresData: Array<{ id: string; matricula: string; nome_guerra?: string; nome?: string }> = []

  const byNomeGuerra = await supabase
    .from('operadores')
    .select('id, nome_guerra, matricula')
    .is('deleted_at', null)
    .eq('ativo', true)
    .order('nome_guerra')

  if (byNomeGuerra.error && byNomeGuerra.error.message.includes('nome_guerra')) {
    const byNome = await supabase
      .from('operadores')
      .select('id, nome, matricula')
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome')

    if (byNome.error) {
      console.error('[LoginPage] Erro ao buscar operadores por nome:', byNome.error.message)
    } else {
      operadoresData = byNome.data ?? []
    }
  } else if (byNomeGuerra.error) {
    console.error('[LoginPage] Erro ao buscar operadores por nome_guerra:', byNomeGuerra.error.message)
  } else {
    operadoresData = byNomeGuerra.data ?? []
  }

  // Lista apenas operadores já cadastrados no domínio da aplicação.
  // Isso evita autenticar usuários do Auth sem vínculo em `operadores`,
  // que depois quebrariam na página de relatório.
  const operadores = (operadoresData ?? [])
    .map((op) => {
      const matricula = String(op.matricula ?? '').trim()
      if (!matricula) return null
      return {
        id: String(op.id),
        nome: String(op.nome_guerra ?? op.nome ?? matricula),
        matricula,
      }
    })
    .filter((op): op is { id: string; nome: string; matricula: string } => op !== null)
    .sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    )

  return <LoginForm operadores={operadores} />
}
