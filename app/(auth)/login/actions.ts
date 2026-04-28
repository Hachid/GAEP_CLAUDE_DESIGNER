'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const matricula = formData.get('matricula') as string
  const senha = formData.get('senha') as string

  if (!matricula || !senha) {
    return { error: 'Selecione um operador e informe a matrícula.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: `${matricula}@gaep.internal`,
    password: senha,
  })

  if (error) {
    return { error: 'Matrícula ou senha inválida.' }
  }

  redirect('/relatorio')
}
