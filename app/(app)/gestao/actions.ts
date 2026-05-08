'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionOrThrow } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { logAudit } from '@/lib/audit'

type ActionResult = { error?: string }
type CsvRow = Record<string, string>
type Alinhamento = 'left' | 'center' | 'right' | 'justify'

function hasValor(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

function normaliza(value: string | null | undefined): string | null {
  const v = value?.trim()
  return v ? v : null
}

function campoDivergiu(input: string | undefined, persisted: string | null | undefined): boolean {
  if (input === undefined) return false
  return normaliza(input) !== normaliza(persisted)
}

function hasCamposComplementares(input: {
  nomeCompleto?: string
  numerica?: string
  tipoSanguineo?: string
  alergia?: string
  contatoEmergencia?: string
  nomeContatoEmergencia?: string
  planoSaude?: string
  numeroCarteirinha?: string
  cpf?: string
  email?: string
}) {
  return (
    hasValor(input.nomeCompleto) ||
    hasValor(input.numerica) ||
    hasValor(input.tipoSanguineo) ||
    hasValor(input.alergia) ||
    hasValor(input.contatoEmergencia) ||
    hasValor(input.nomeContatoEmergencia) ||
    hasValor(input.planoSaude) ||
    hasValor(input.numeroCarteirinha) ||
    hasValor(input.cpf) ||
    hasValor(input.email)
  )
}

export interface BlocoEstiloRelatorio {
  fontFamily: string
  fontColor: string
  align: Alinhamento
  indent: number
  lineHeight: number
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  marginTop?: number
  marginBottom?: number
}

export interface ConfigRelatorioData {
  id: string | null
  tituloTexto: string
  subtituloTexto: string
  descricaoTexto: string
  rodapeTexto: string
  tituloEstilo: BlocoEstiloRelatorio
  subtituloEstilo: BlocoEstiloRelatorio
  descricaoEstilo: BlocoEstiloRelatorio
  rodapeEstilo: BlocoEstiloRelatorio
  printMargins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

interface OperadorCtx {
  admin: ReturnType<typeof createAdminClient>
  operadorId: string
  gaepId: string
  perfil: string
}

async function getAdminCtx(): Promise<OperadorCtx> {
  const user = await getSessionOrThrow()

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
  nomeCompleto?: string
  matricula: string
  senha: string
  perfil: string
  equipe: string
  numerica?: string
  tipoSanguineo?: string
  alergia?: string
  contatoEmergencia?: string
  nomeContatoEmergencia?: string
  planoSaude?: string
  numeroCarteirinha?: string
  cpf?: string
  email?: string
}): Promise<{ id?: string; error?: string }> {
  const PERFIS_VALIDOS = ['OPERADOR', 'ADMIN', 'SUPER_ADMIN'] as const
  if (!PERFIS_VALIDOS.includes(input.perfil as (typeof PERFIS_VALIDOS)[number])) {
    return { error: 'Perfil inválido. Use OPERADOR, ADMIN ou SUPER_ADMIN.' }
  }

  try {
    const { admin, operadorId: adminId } = await getAdminCtx()

    const senha = input.senha.trim() || '1234'
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: `${input.matricula.trim()}@gaep.internal`,
      password: senha,
      email_confirm: true,
    })
    if (authErr) return { error: authErr.message }

    const insertPayload = {
      gaep_id: input.gaepId,
      auth_id: authData.user.id,
      nome: input.nome.trim(),
      nome_completo: input.nomeCompleto?.trim() || null,
      matricula: input.matricula.trim(),
      perfil: input.perfil,
      equipe: input.equipe || null,
      numerica: input.numerica?.trim() || null,
      tipo_sanguineo: input.tipoSanguineo?.trim() || null,
      alergia: input.alergia?.trim() || null,
      contato_emergencia: input.contatoEmergencia?.trim() || null,
      nome_contato_emergencia: input.nomeContatoEmergencia?.trim() || null,
      plano_saude: input.planoSaude?.trim() || null,
      numero_carteirinha: input.numeroCarteirinha?.trim() || null,
      cpf: input.cpf?.trim() || null,
      email: input.email?.trim() || null,
      ativo: true,
    }

    let { data, error } = await admin
      .from('operadores')
      .insert(insertPayload)
      .select('id')
      .single()

    const pediuCamposComplementares = hasCamposComplementares(input)

    if (error) {
      const retryWithoutNomeCompleto = await admin
        .from('operadores')
        .insert({
          gaep_id: input.gaepId,
          auth_id: authData.user.id,
          nome: input.nome.trim(),
          matricula: input.matricula.trim(),
          perfil: input.perfil,
          equipe: input.equipe || null,
          numerica: input.numerica?.trim() || null,
          tipo_sanguineo: input.tipoSanguineo?.trim() || null,
          alergia: input.alergia?.trim() || null,
          contato_emergencia: input.contatoEmergencia?.trim() || null,
          nome_contato_emergencia: input.nomeContatoEmergencia?.trim() || null,
          plano_saude: input.planoSaude?.trim() || null,
          numero_carteirinha: input.numeroCarteirinha?.trim() || null,
          cpf: input.cpf?.trim() || null,
          email: input.email?.trim() || null,
          ativo: true,
        })
        .select('id')
        .single()
      data = retryWithoutNomeCompleto.data
      error = retryWithoutNomeCompleto.error
    }

    if (error) {
      const fallbackInsert = await admin
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
      data = fallbackInsert.data
      error = fallbackInsert.error
    }

    if (error) return { error: error.message }
    if (pediuCamposComplementares && !insertPayload.nome_completo && !data?.id) {
      return { error: 'Não foi possível salvar os campos complementares do operador.' }
    }
    if (pediuCamposComplementares) {
      const { data: validacao, error: valErr } = await admin
        .from('operadores')
        .select('id, nome_completo, numerica, tipo_sanguineo, alergia, contato_emergencia, nome_contato_emergencia, plano_saude, numero_carteirinha, cpf, email')
        .eq('id', String(data?.id))
        .maybeSingle()
      if (valErr || !validacao) {
        return { error: 'Operador criado, mas não foi possível confirmar os campos complementares no banco.' }
      }
      const naoPersistiu =
        campoDivergiu(input.nomeCompleto, validacao.nome_completo) ||
        campoDivergiu(input.numerica, validacao.numerica) ||
        campoDivergiu(input.tipoSanguineo, validacao.tipo_sanguineo) ||
        campoDivergiu(input.alergia, validacao.alergia) ||
        campoDivergiu(input.contatoEmergencia, validacao.contato_emergencia) ||
        campoDivergiu(input.nomeContatoEmergencia, validacao.nome_contato_emergencia) ||
        campoDivergiu(input.planoSaude, validacao.plano_saude) ||
        campoDivergiu(input.numeroCarteirinha, validacao.numero_carteirinha) ||
        campoDivergiu(input.cpf, validacao.cpf) ||
        campoDivergiu(input.email, validacao.email)
      if (naoPersistiu) {
        return { error: 'Campos complementares não persistiram. Aplique a migration de operadores no banco.' }
      }
    }
    if (!data?.id) return { error: 'Não foi possível criar o operador.' }
    revalidatePath('/gestao')
    logAudit({ gaepId: input.gaepId, operadorId: adminId, acao: 'CREATE', tabela: 'operadores', registroId: String(data.id), dadosDepois: { nome: input.nome, matricula: input.matricula, perfil: input.perfil } }).catch(() => {})
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function editarOperador(
  id: string,
  updates: {
    nome: string
    nomeCompleto?: string
    matricula?: string
    perfil: string
    equipe: string | null
    numerica?: string
    tipoSanguineo?: string
    alergia?: string
    contatoEmergencia?: string
    nomeContatoEmergencia?: string
    planoSaude?: string
    numeroCarteirinha?: string
    cpf?: string
    email?: string
  }
): Promise<ActionResult> {
  const PERFIS_VALIDOS = ['OPERADOR', 'ADMIN', 'SUPER_ADMIN'] as const
  if (!PERFIS_VALIDOS.includes(updates.perfil as (typeof PERFIS_VALIDOS)[number])) {
    return { error: 'Perfil inválido. Use OPERADOR, ADMIN ou SUPER_ADMIN.' }
  }

  try {
    const { admin, operadorId: adminId, gaepId } = await getAdminCtx()
    const pediuCamposComplementares = hasCamposComplementares(updates)
    let { error } = await admin
      .from('operadores')
      .update({
        nome: updates.nome.trim(),
        nome_completo: updates.nomeCompleto?.trim() || null,
        matricula: updates.matricula?.trim() || undefined,
        perfil: updates.perfil,
        equipe: updates.equipe || null,
        numerica: updates.numerica?.trim() || null,
        tipo_sanguineo: updates.tipoSanguineo?.trim() || null,
        alergia: updates.alergia?.trim() || null,
        contato_emergencia: updates.contatoEmergencia?.trim() || null,
        nome_contato_emergencia: updates.nomeContatoEmergencia?.trim() || null,
        plano_saude: updates.planoSaude?.trim() || null,
        numero_carteirinha: updates.numeroCarteirinha?.trim() || null,
        cpf: updates.cpf?.trim() || null,
        email: updates.email?.trim() || null,
      })
      .eq('id', id)

    if (error) {
      const retryWithoutNomeCompleto = await admin
        .from('operadores')
        .update({
          nome: updates.nome.trim(),
          matricula: updates.matricula?.trim() || undefined,
          perfil: updates.perfil,
          equipe: updates.equipe || null,
          numerica: updates.numerica?.trim() || null,
          tipo_sanguineo: updates.tipoSanguineo?.trim() || null,
          alergia: updates.alergia?.trim() || null,
          contato_emergencia: updates.contatoEmergencia?.trim() || null,
          nome_contato_emergencia: updates.nomeContatoEmergencia?.trim() || null,
          plano_saude: updates.planoSaude?.trim() || null,
          numero_carteirinha: updates.numeroCarteirinha?.trim() || null,
          cpf: updates.cpf?.trim() || null,
          email: updates.email?.trim() || null,
        })
        .eq('id', id)
      error = retryWithoutNomeCompleto.error
    }

    if (error) {
      const fallback = await admin
        .from('operadores')
        .update({
          nome: updates.nome.trim(),
          matricula: updates.matricula?.trim() || undefined,
          perfil: updates.perfil,
          equipe: updates.equipe || null,
        })
        .eq('id', id)
      error = fallback.error
    }

    if (error) return { error: error.message }
    if (pediuCamposComplementares) {
      const { data: validacao, error: valErr } = await admin
        .from('operadores')
        .select('id, nome_completo, numerica, tipo_sanguineo, alergia, contato_emergencia, nome_contato_emergencia, plano_saude, numero_carteirinha, cpf, email')
        .eq('id', id)
        .maybeSingle()
      if (valErr || !validacao) {
        return { error: 'Alteração salva parcialmente. Não foi possível validar os campos complementares.' }
      }
      const naoPersistiu =
        campoDivergiu(updates.nomeCompleto, validacao.nome_completo) ||
        campoDivergiu(updates.numerica, validacao.numerica) ||
        campoDivergiu(updates.tipoSanguineo, validacao.tipo_sanguineo) ||
        campoDivergiu(updates.alergia, validacao.alergia) ||
        campoDivergiu(updates.contatoEmergencia, validacao.contato_emergencia) ||
        campoDivergiu(updates.nomeContatoEmergencia, validacao.nome_contato_emergencia) ||
        campoDivergiu(updates.planoSaude, validacao.plano_saude) ||
        campoDivergiu(updates.numeroCarteirinha, validacao.numero_carteirinha) ||
        campoDivergiu(updates.cpf, validacao.cpf) ||
        campoDivergiu(updates.email, validacao.email)
      if (naoPersistiu) {
        return { error: 'Campos complementares não persistiram. Aplique a migration de operadores no banco.' }
      }
    }
    revalidatePath('/gestao')
    logAudit({ gaepId, operadorId: adminId, acao: 'UPDATE', tabela: 'operadores', registroId: id, dadosDepois: { nome: updates.nome, perfil: updates.perfil } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function toggleAtivoOperador(id: string, ativo: boolean): Promise<ActionResult> {
  try {
    const { admin, operadorId: adminId, gaepId } = await getAdminCtx()
    const { error } = await admin.from('operadores').update({ ativo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    logAudit({ gaepId, operadorId: adminId, acao: 'UPDATE', tabela: 'operadores', registroId: id, dadosDepois: { ativo } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Atividades ────────────────────────────────────────────────

export async function adicionarAtividade(
  nome: string
): Promise<{ id?: string; error?: string }> {
  try {
    const ctx = await getAdminCtx()
    const { admin } = ctx
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return { error: 'Informe um nome válido para a atividade.' }

    const { data: existente, error: existenteErr } = await admin
      .from('atividades')
      .select('id')
      .ilike('nome', nomeLimpo)
      .is('deleted_at', null)
      .maybeSingle()
    if (existenteErr) return { error: existenteErr.message }
    if (existente) return { error: 'Já existe uma atividade com esse nome.' }

    const { data, error } = await admin
      .from('atividades')
      .insert({ nome: nomeLimpo, ativo: true })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidateTag('atividades-lookup')
    logAudit({ gaepId: ctx.gaepId, operadorId: ctx.operadorId, acao: 'CREATE', tabela: 'atividades', registroId: String(data.id), dadosDepois: { nome: nomeLimpo } }).catch(() => {})
    return { id: String(data.id) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function editarAtividade(
  id: string,
  nome: string
): Promise<ActionResult> {
  try {
    const { admin, operadorId, gaepId } = await getAdminCtx()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return { error: 'Informe um nome válido para a atividade.' }

    const { data: existente, error: existenteErr } = await admin
      .from('atividades')
      .select('id')
      .ilike('nome', nomeLimpo)
      .is('deleted_at', null)
      .neq('id', id)
      .maybeSingle()
    if (existenteErr) return { error: existenteErr.message }
    if (existente) return { error: 'Já existe uma atividade com esse nome.' }

    const { error } = await admin
      .from('atividades')
      .update({ nome: nomeLimpo })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidateTag('atividades-lookup')
    logAudit({ gaepId, operadorId, acao: 'UPDATE', tabela: 'atividades', registroId: id, dadosDepois: { nome: nomeLimpo } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removerAtividade(id: string): Promise<ActionResult> {
  try {
    const { admin, operadorId, gaepId } = await getAdminCtx()
    const { error } = await admin
      .from('atividades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidateTag('atividades-lookup')
    logAudit({ gaepId, operadorId, acao: 'DELETE', tabela: 'atividades', registroId: id }).catch(() => {})
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

export async function salvarDiasUteisMes(
  gaepId: string,
  referenciaMes: string,
  diasUteis: number
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const referencia = referenciaMes.trim()
    const dias = Math.max(0, Math.min(31, Math.round(Number(diasUteis) || 0)))
    if (!/^\d{4}-\d{2}$/.test(referencia)) {
      return { error: 'Referência do mês inválida. Use o formato AAAA-MM.' }
    }

    const { error } = await admin.from('gaep_dias_uteis').upsert(
      {
        gaep_id: gaepId,
        referencia_mes: referencia,
        dias_uteis: dias,
      },
      { onConflict: 'gaep_id,referencia_mes' }
    )

    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidatePath('/operadores')
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
    const { admin, operadorId: adminId, gaepId: adminGaepId } = await getAdminCtx()
    const { error } = await admin.from('config_ia').upsert(
      { gaep_id: gaepId, modelo, temperatura, prompt, updated_at: new Date().toISOString(), updated_by: operadorId },
      { onConflict: 'gaep_id' }
    )
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    logAudit({ gaepId: adminGaepId, operadorId: adminId, acao: 'UPDATE', tabela: 'config_ia', dadosDepois: { modelo, temperatura } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function salvarConfigRelatorio(
  gaepId: string,
  operadorId: string,
  config: ConfigRelatorioData
): Promise<ActionResult> {
  try {
    const { admin, operadorId: adminId, gaepId: adminGaepId } = await getAdminCtx()
    let { error } = await admin.from('config_relatorio').upsert(
      {
        gaep_id: gaepId,
        titulo_texto: config.tituloTexto.trim(),
        subtitulo_texto: config.subtituloTexto.trim(),
        descricao_texto: config.descricaoTexto.trim(),
        rodape_texto: config.rodapeTexto.trim(),
        titulo_estilo: config.tituloEstilo,
        subtitulo_estilo: config.subtituloEstilo,
        descricao_estilo: config.descricaoEstilo,
        rodape_estilo: config.rodapeEstilo,
        layout_pdf: {
          margins: config.printMargins,
        },
        updated_by: operadorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'gaep_id' }
    )
    if (error) {
      const fallback = await admin.from('config_relatorio').upsert(
        {
          gaep_id: gaepId,
          titulo_texto: config.tituloTexto.trim(),
          subtitulo_texto: config.subtituloTexto.trim(),
          descricao_texto: config.descricaoTexto.trim(),
          rodape_texto: config.rodapeTexto.trim(),
          titulo_estilo: config.tituloEstilo,
          subtitulo_estilo: config.subtituloEstilo,
          descricao_estilo: config.descricaoEstilo,
          rodape_estilo: config.rodapeEstilo,
          updated_by: operadorId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'gaep_id' }
      )
      error = fallback.error
    }
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidatePath('/relatorio')
    logAudit({ gaepId: adminGaepId, operadorId: adminId, acao: 'UPDATE', tabela: 'config_relatorio', dadosDepois: { tituloTexto: config.tituloTexto } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function salvarMargensPdf(
  gaepId: string,
  operadorId: string,
  margins: { top: number; right: number; bottom: number; left: number }
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const clamped = {
      top: Math.max(0, Math.min(40, Number(margins.top) || 0)),
      right: Math.max(0, Math.min(40, Number(margins.right) || 0)),
      bottom: Math.max(0, Math.min(40, Number(margins.bottom) || 0)),
      left: Math.max(0, Math.min(40, Number(margins.left) || 0)),
    }
    const { error } = await admin.from('config_relatorio').upsert(
      {
        gaep_id: gaepId,
        layout_pdf: { margins: clamped },
        updated_by: operadorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'gaep_id' }
    )
    if (error) {
      if (error.message.includes('layout_pdf')) {
        return { error: 'Banco ainda sem coluna layout_pdf. Execute a migration 20260430_config_relatorio_layout_pdf.sql.' }
      }
      return { error: error.message }
    }
    revalidatePath('/gestao')
    revalidatePath('/relatorio')
    revalidatePath('/missoes/relatorio')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function uploadTimbrado(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  try {
    const { admin, gaepId } = await getAdminCtx()
    const file = formData.get('file')
    if (!(file instanceof Blob)) return { error: 'Arquivo inválido.' }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    const contentType = file.type || 'image/png'
    if (!validTypes.includes(contentType)) {
      return { error: 'Apenas PNG ou JPEG são aceitos para o timbrado.' }
    }

    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
    const path = `timbrado/${gaepId}/timbrado.${ext}`
    const bytes = await file.arrayBuffer()

    const { error: storageErr } = await admin.storage
      .from('relatorios')
      .upload(path, bytes, { contentType, upsert: true })

    if (storageErr) return { error: `Upload falhou: ${storageErr.message}` }

    const { data: { publicUrl } } = admin.storage
      .from('relatorios')
      .getPublicUrl(path)

    const { error: dbErr } = await admin.from('config_relatorio').upsert(
      { gaep_id: gaepId, timbrado_url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'gaep_id' }
    )
    if (dbErr) return { error: dbErr.message }

    revalidatePath('/gestao')
    revalidatePath('/relatorio')
    return { url: publicUrl }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function salvarTimbradoBase64(
  gaepId: string,
  dataUrl: string
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin
      .from('config_relatorio')
      .upsert(
        { gaep_id: gaepId, timbrado_url: dataUrl, updated_at: new Date().toISOString() },
        { onConflict: 'gaep_id' }
      )
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidatePath('/relatorio')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removerTimbrado(): Promise<ActionResult> {
  try {
    const { admin, gaepId } = await getAdminCtx()
    const { error } = await admin
      .from('config_relatorio')
      .update({ timbrado_url: null, updated_at: new Date().toISOString() })
      .eq('gaep_id', gaepId)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    revalidatePath('/relatorio')
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
    const ctx = await getAdminCtx()
    if (ctx.perfil !== 'SUPER_ADMIN') return { error: 'Acesso restrito ao Super Admin.' }
    const { admin } = ctx

    const { data, error } = await admin
      .from('gaeps')
      .insert({ codigo: input.codigo.trim(), cidade: input.cidade.trim(), estado: input.estado.trim().toUpperCase() })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    logAudit({ gaepId: null, operadorId: ctx.operadorId, acao: 'CREATE', tabela: 'gaeps', registroId: String(data.id), dadosDepois: { codigo: input.codigo, cidade: input.cidade, estado: input.estado } }).catch(() => {})
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

export async function editarGaep(
  id: string,
  input: { codigo: string; cidade: string; estado: string }
): Promise<ActionResult> {
  try {
    const { admin, perfil, operadorId, gaepId } = await getAdminCtx()
    if (perfil !== 'SUPER_ADMIN') return { error: 'Acesso restrito ao Super Admin.' }
    const { error } = await admin
      .from('gaeps')
      .update({
        codigo: input.codigo.trim(),
        cidade: input.cidade.trim(),
        estado: input.estado.trim().toUpperCase(),
      })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    logAudit({ gaepId, operadorId, acao: 'UPDATE', tabela: 'gaeps', registroId: id, dadosDepois: { codigo: input.codigo, cidade: input.cidade, estado: input.estado } }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function excluirGaep(id: string): Promise<ActionResult> {
  try {
    const { admin, perfil, operadorId, gaepId } = await getAdminCtx()
    if (perfil !== 'SUPER_ADMIN') return { error: 'Acesso restrito ao Super Admin.' }
    const { error } = await admin
      .from('gaeps')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/gestao')
    logAudit({ gaepId, operadorId, acao: 'DELETE', tabela: 'gaeps', registroId: id }).catch(() => {})
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Importação de Relatórios (CSV) ────────────────────────────

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) return []

  const splitLine = (line: string) => {
    const out: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ';' && !inQuotes) {
        out.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    out.push(current.trim())
    return out
  }

  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  return lines.slice(1).map((line) => {
    const values = splitLine(line)
    const row: CsvRow = {}
    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = (values[i] ?? '').trim()
    }
    return row
  })
}

function getHorasTotais(horaInicio: string, horaFim: string): number {
  const [sh, sm] = horaInicio.split(':').map(Number)
  const [eh, em] = horaFim.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

export async function importarRelatoriosCsv(csvContent: string): Promise<{
  inserted?: number
  updated?: number
  skipped?: number
  errors?: Array<{ line: number; reason: string }>
  error?: string
}> {
  try {
    const { admin, gaepId, perfil } = await getAdminCtx()
    const rows = parseCsv(csvContent)
    if (rows.length === 0) {
      return { error: 'CSV vazio ou inválido. Use o modelo e mantenha o separador ";".' }
    }

    const [opsRes, catRes, atRes, gaepsRes] = await Promise.all([
      admin.from('operadores').select('id, matricula, gaep_id').is('deleted_at', null),
      admin.from('categorias_atividade').select('id, nome'),
      admin.from('atividades').select('id, nome').is('deleted_at', null),
      admin.from('gaeps').select('id, codigo'),
    ])

    if (opsRes.error || catRes.error || atRes.error || gaepsRes.error) {
      return { error: 'Falha ao carregar dicionários de referência para importação.' }
    }

    const gaepByCodigo = new Map((gaepsRes.data ?? []).map((g) => [String(g.codigo).toUpperCase(), String(g.id)]))
    const catByNome = new Map((catRes.data ?? []).map((c) => [String(c.nome).toUpperCase(), String(c.id)]))
    const opByMatricula = new Map((opsRes.data ?? []).map((o) => [String(o.matricula), { id: String(o.id), gaep_id: String(o.gaep_id) }]))
    const atvByNome = new Map(
      (atRes.data ?? []).map((a) => [String(a.nome).toUpperCase(), String(a.id)])
    )

    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors: Array<{ line: number; reason: string }> = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const line = i + 2
      const relatorioId = row.relatorio_id
      const gaepCodigo = (row.gaep_codigo || '').toUpperCase()
      const gaepImportId = gaepByCodigo.get(gaepCodigo)
      const relatorMatricula = row.relator_matricula
      const categoriaNome = (row.categoria_nome || '').toUpperCase()
      const atividadeNome = (row.atividade_nome || '').toUpperCase()
      const data = row.data
      const horaInicio = row.hora_inicio
      const horaFim = row.hora_fim
      const descricaoRevisada = row.descricao_revisada

      if (!gaepImportId || !relatorMatricula || !categoriaNome || !atividadeNome || !data || !horaInicio || !horaFim || !descricaoRevisada) {
        skipped += 1
        errors.push({ line, reason: 'Campos obrigatórios ausentes ou gaep_codigo inválido.' })
        continue
      }

      if (perfil !== 'SUPER_ADMIN' && gaepImportId !== gaepId) {
        skipped += 1
        errors.push({ line, reason: 'GAEP fora da permissão do usuário logado.' })
        continue
      }

      const relator = opByMatricula.get(relatorMatricula)
      if (!relator || relator.gaep_id !== gaepImportId) {
        skipped += 1
        errors.push({ line, reason: 'relator_matricula não encontrada para o GAEP informado.' })
        continue
      }

      const categoriaId = catByNome.get(categoriaNome)
      if (!categoriaId) {
        skipped += 1
        errors.push({ line, reason: 'categoria_nome não encontrada.' })
        continue
      }

      const atividadeId = atvByNome.get(atividadeNome)
      if (!atividadeId) {
        skipped += 1
        errors.push({ line, reason: 'atividade_nome não encontrada.' })
        continue
      }

      const payload = {
        gaep_id: gaepImportId,
        relatorista_id: relator.id,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        horas_totais: getHorasTotais(horaInicio, horaFim),
        categoria_id: categoriaId,
        atividade_id: atividadeId,
        outros_integrantes: row.outros_integrantes || null,
        descricao_bruta: row.descricao_bruta || descricaoRevisada,
        descricao_revisada: descricaoRevisada,
        ocorrencias: row.ocorrencias || null,
        fotos_urls: (row.fotos_urls || '')
          .split('|')
          .map((x) => x.trim())
          .filter(Boolean),
      }

      let finalRelatorioId: string | null = null
      if (relatorioId) {
        const { data: upd, error: updErr } = await admin
          .from('relatorios')
          .update(payload)
          .eq('id', relatorioId)
          .select('id')
          .maybeSingle()
        if (updErr) {
          skipped += 1
          errors.push({ line, reason: `Falha ao atualizar relatorio_id ${relatorioId}.` })
          continue
        }
        if (upd?.id) {
          finalRelatorioId = String(upd.id)
          updated += 1
        }
      }

      if (!finalRelatorioId) {
        const { data: ins, error: insErr } = await admin
          .from('relatorios')
          .insert(payload)
          .select('id')
          .single()
        if (insErr) {
          skipped += 1
          errors.push({ line, reason: 'Falha ao inserir relatório.' })
          continue
        }
        finalRelatorioId = String(ins.id)
        inserted += 1
      }

      const equipeMatriculas = (row.equipe_matriculas || '')
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean)
      if (equipeMatriculas.length > 0 && finalRelatorioId) {
        await admin.from('relatorio_participantes').delete().eq('relatorio_id', finalRelatorioId)
        const participantes = equipeMatriculas
          .map((matricula) => opByMatricula.get(matricula))
          .filter((op): op is { id: string; gaep_id: string } => Boolean(op))
          .filter((op) => op.gaep_id === gaepImportId)
          .map((op) => ({
            relatorio_id: finalRelatorioId,
            operador_id: op.id,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            horas_totais: getHorasTotais(horaInicio, horaFim),
          }))
        if (participantes.length > 0) {
          await admin.from('relatorio_participantes').insert(participantes)
        }
      }
    }

    revalidatePath('/gestao')
    revalidatePath('/relatorio')
    return { inserted, updated, skipped, errors }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
