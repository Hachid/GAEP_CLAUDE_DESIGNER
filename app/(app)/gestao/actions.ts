'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionResult = { error?: string }

interface OperadorCtx {
  admin: ReturnType<typeof createAdminClient>
  operadorId: string
  gaepId: string
  perfil: string
}

async function getAdminCtx(): Promise<OperadorCtx> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const admin = createAdminClient()
  const { data: op } = await admin
    .from('operadores')
    .select('id, gaep_id, perfil')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!op) throw new Error('Operador não encontrado.')
  const perfil = String(op.perfil)
  if (!['ADMIN', 'SUPER_ADMIN'].includes(perfil)) throw new Error('Acesso negado.')

  return { admin, operadorId: String(op.id), gaepId: String(op.gaep_id), perfil }
}

// ── Efetivo ───────────────────────────────────────────────────

export async function criarOperador(input: {
  gaepId: string
  nome: string
  matricula: string
  senha: string
  perfil: string
  equipe: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const { admin } = await getAdminCtx()

    const senha = input.senha.trim() || '1234'
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: `${input.matricula.trim()}@gaep.internal`,
      password: senha,
      email_confirm: true,
    })
    if (authErr) return { error: authErr.message }

    const { data, error } = await admin
      .from('operadores')
      .insert({
        gaep_id: input.gaepId,
        auth_id: authData.user.id,
        nome: input.nome.trim(),
        matricula: input.matricula.trim(),
        perfil: input.perfil,
        equipe: input.equipe || null,
        ativo: true,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function editarOperador(
  id: string,
  updates: { nome: string; perfil: string; equipe: string | null }
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin
      .from('operadores')
      .update({ nome: updates.nome.trim(), perfil: updates.perfil, equipe: updates.equipe || null })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function toggleAtivoOperador(id: string, ativo: boolean): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin.from('operadores').update({ ativo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Atividades ────────────────────────────────────────────────

export async function adicionarAtividade(
  categoriaId: string,
  nome: string
): Promise<{ id?: string; error?: string }> {
  try {
    const { admin } = await getAdminCtx()
    const { data, error } = await admin
      .from('atividades')
      .insert({ categoria_id: categoriaId, nome: nome.trim(), ativo: true })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removerAtividade(id: string): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin
      .from('atividades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Feriados ──────────────────────────────────────────────────

export async function adicionarFeriado(
  gaepId: string,
  data: string,
  descricao: string
): Promise<{ id?: string; error?: string }> {
  try {
    const { admin } = await getAdminCtx()
    const { data: row, error } = await admin
      .from('feriados')
      .insert({ gaep_id: gaepId, data, descricao: descricao.trim() })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return { id: String(row.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removerFeriado(id: string): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin.from('feriados').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Config IA ─────────────────────────────────────────────────

export async function salvarConfigIA(
  gaepId: string,
  modelo: string,
  temperatura: number,
  prompt: string,
  operadorId: string
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin.from('config_ia').upsert(
      { gaep_id: gaepId, modelo, temperatura, prompt, updated_at: new Date().toISOString(), updated_by: operadorId },
      { onConflict: 'gaep_id' }
    )
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function testarPromptIA(
  modelo: string,
  temperatura: number,
  prompt: string
): Promise<{ resultado?: string; error?: string }> {
  try {
    await getAdminCtx()

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return { error: 'OPENAI_API_KEY não configurada.' }

    const userMsg =
      'Data: 28/04/2026\nHorário: 08:00 às 14:00\nCategoria: OPERAR\nAtividade: Escolta\n' +
      'Equipe: Operador 1, Operador 2\nDescrição bruta: escolta vip sem incidentes no trajeto'

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: modelo,
        temperature: temperatura,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 512,
      }),
    })

    interface OpenAIResp {
      choices?: Array<{ message: { content: string } }>
      error?: { message: string }
    }
    const json = (await res.json()) as OpenAIResp
    if (!res.ok || json.error) return { error: json.error?.message ?? 'Erro da IA.' }
    return { resultado: json.choices?.[0]?.message?.content?.trim() ?? '' }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Diárias ───────────────────────────────────────────────────

export async function editarDiaria(
  id: string,
  locais: string,
  valor: number
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin
      .from('tipos_missao')
      .update({ locais: locais.trim(), valor, vigencia: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── GAEPs (SUPER_ADMIN) ───────────────────────────────────────

export async function adicionarGaep(input: {
  codigo: string
  cidade: string
  estado: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const { admin, perfil } = await getAdminCtx()
    if (perfil !== 'SUPER_ADMIN') return { error: 'Acesso restrito ao Super Admin.' }

    const { data, error } = await admin
      .from('gaeps')
      .insert({ codigo: input.codigo.trim(), cidade: input.cidade.trim(), estado: input.estado.trim().toUpperCase() })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function toggleAtivoGaep(id: string, ativo: boolean): Promise<ActionResult> {
  try {
    const { admin, perfil } = await getAdminCtx()
    if (perfil !== 'SUPER_ADMIN') return { error: 'Acesso restrito ao Super Admin.' }
    const { error } = await admin.from('gaeps').update({ ativo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
