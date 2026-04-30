'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
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

type MissaoRowAudit = {
  id: string
  gaep_id: string
  operador_id: string | null
  tipo_missao_id: string | null
  tipo_snapshot: string
  qtd: number
  valor_unitario_snapshot: number
  valor_total: number
  observacao: string | null
}

/**
 * Atualiza tipo, quantidade, valores e observação de uma missão do mesmo GAEP do usuário.
 * Grava linha em `audit_log` (dados_antes / dados_depois) para auditoria.
 */
export async function editarMissao(input: {
  id: string
  tipoMissaoId: string
  tipoSnapshot: string
  qtd: number
  valorUnitarioSnapshot: number
  observacao: string
  motivo?: string
}): Promise<ActionResult> {
  try {
    const { admin, operadorId: editorId, gaepId } = await getCtx()

    let ip = 'unknown'
    try {
      const headerStore = await headers()
      ip = headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? 'unknown'
    } catch {
      /* testes */
    }

    if (input.qtd < 1) return { error: 'Quantidade inválida.' }

    const { data: row, error: fetchErr } = await admin
      .from('missoes')
      .select(
        'id, gaep_id, operador_id, tipo_missao_id, tipo_snapshot, qtd, valor_unitario_snapshot, valor_total, observacao'
      )
      .eq('id', input.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchErr) return { error: fetchErr.message }
    if (!row) return { error: 'Missão não encontrada.' }
    const antes = row as MissaoRowAudit
    if (String(antes.gaep_id) !== gaepId) return { error: 'Sem permissão para editar esta missão.' }

    const valorTotal = input.qtd * input.valorUnitarioSnapshot
    const obsTrim = input.observacao.trim() || null
    const motivoTrim = (input.motivo ?? '').trim() || null

    const { error: updErr } = await admin
      .from('missoes')
      .update({
        tipo_missao_id: input.tipoMissaoId,
        tipo_snapshot: input.tipoSnapshot,
        qtd: input.qtd,
        valor_unitario_snapshot: input.valorUnitarioSnapshot,
        valor_total: valorTotal,
        observacao: obsTrim,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)

    if (updErr) return { error: updErr.message }

    const dadosDepois = {
      tipo_missao_id: input.tipoMissaoId,
      tipo_snapshot: input.tipoSnapshot,
      qtd: input.qtd,
      valor_unitario_snapshot: input.valorUnitarioSnapshot,
      valor_total: valorTotal,
      observacao: obsTrim,
      motivo: motivoTrim,
    }

    void admin
      .from('audit_log')
      .insert({
        gaep_id: gaepId,
        operador_id: editorId,
        acao: 'UPDATE',
        tabela: 'missoes',
        registro_id: input.id,
        dados_antes: {
          tipo_missao_id: antes.tipo_missao_id,
          tipo_snapshot: antes.tipo_snapshot,
          qtd: antes.qtd,
          valor_unitario_snapshot: Number(antes.valor_unitario_snapshot),
          valor_total: Number(antes.valor_total),
          observacao: antes.observacao,
        },
        dados_depois: dadosDepois,
        ip,
      })
      .then(() => {})
      .catch((err: unknown) => console.error('[editarMissao] audit_log:', err))

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
