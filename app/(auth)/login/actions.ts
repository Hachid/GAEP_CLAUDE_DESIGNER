'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

function nomeGuerraCoincide(a: string, b: string): boolean {
  return (
    a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'accent' }) === 0
  )
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const nomeGuerra = (formData.get('nome_guerra') as string | null)?.trim() ?? ''
  const senha = (formData.get('senha') as string | null)?.trim() ?? ''

  if (!nomeGuerra || !senha) {
    return { error: 'Informe o nome de guerra e a senha.' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    return {
      error:
        'Configuração do servidor incompleta (chave de serviço). Contate o administrador.',
    }
  }

  const admin = createAdminClient()
  const { data: rows, error: queryError } = await admin
    .from('operadores')
    .select('id, gaep_id, perfil, matricula, nome')
    .is('deleted_at', null)
    .eq('ativo', true)

  if (queryError) {
    return { error: 'Não foi possível validar o cadastro. Tente novamente.' }
  }

  const matches = (rows ?? []).filter(
    (row) =>
      row.nome != null &&
      nomeGuerraCoincide(nomeGuerra, String(row.nome))
  )

  if (matches.length === 0) {
    return { error: 'Nome de guerra ou matrícula inválidos.' }
  }

  if (matches.length > 1) {
    return {
      error:
        'Há mais de um operador com este nome de guerra. Contate o administrador.',
    }
  }

  const matricula = String(matches[0].matricula ?? '').trim()
  if (!matricula) {
    return { error: 'Nome de guerra ou matrícula inválidos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: `${matricula}@gaep.internal`,
    password: senha,
  })

  if (error) {
    return { error: 'Nome de guerra ou matrícula inválidos.' }
  }

  const operadorSelecionado = matches[0]
  await logAudit({
    gaepId: String(operadorSelecionado.gaep_id ?? ''),
    operadorId: String(operadorSelecionado.id ?? ''),
    acao: 'ACESSO',
    tabela: 'login',
    dadosDepois: {
      tela: '/login',
      evento: 'LOGIN_SUCESSO',
      perfil: String(operadorSelecionado.perfil ?? ''),
      nomeGuerra: nomeGuerra,
    },
  })

  redirect('/relatorio')
}
