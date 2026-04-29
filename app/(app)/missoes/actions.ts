'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionResult = { error?: string }

interface OperadorCtx {
  admin: ReturnType<typeof createAdminClient>
  operadorId: string
  gaepId: string
}

async function getCtx(): Promise<OperadorCtx> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const admin = createAdminClient()

  let op: { id: string; gaep_id: string } | null = null

  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, gaep_id')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (byAuthId) {
    op = byAuthId as { id: string; gaep_id: string }
  } else {
    const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''
    if (matricula) {
      const { data: byMat } = await admin
        .from('operadores')
        .select('id, gaep_id')
        .eq('matricula', matricula)
        .is('deleted_at', null)
        .maybeSingle()
      op = (byMat as { id: string; gaep_id: string } | null) ?? null
    }
  }

  if (!op) throw new Error('Operador não encontrado.')
  return { admin, operadorId: String(op.id), gaepId: String(op.gaep_id) }
}

export async function registrarMissao(input: {
  operadorId: string
  tipoMissaoId: string
  tipoSnapshot: string
  qtd: number
  valorUnitarioSnapshot: number
  observacao: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const { admin, operadorId: createdBy, gaepId } = await getCtx()

    const valorTotal = input.qtd * input.valorUnitarioSnapshot

    const { data, error } = await admin
      .from('missoes')
      .insert({
        gaep_id: gaepId,
        operador_id: input.operadorId,
        tipo_missao_id: input.tipoMissaoId,
        tipo_snapshot: input.tipoSnapshot,
        qtd: input.qtd,
        valor_unitario_snapshot: input.valorUnitarioSnapshot,
        valor_total: valorTotal,
        observacao: input.observacao.trim() || null,
        created_by: createdBy,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath('/missoes')
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function editarObservacaoMissao(
  id: string,
  observacao: string
): Promise<ActionResult> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin
      .from('missoes')
      .update({
        observacao: observacao.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) return { error: error.message }
    revalidatePath('/missoes')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function excluirMissao(id: string): Promise<ActionResult> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin
      .from('missoes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) return { error: error.message }
    revalidatePath('/missoes')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
