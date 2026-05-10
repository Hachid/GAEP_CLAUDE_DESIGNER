'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getSessionOrThrow } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { emailSistemaFromMatricula } from '@/lib/email-sistema'

export type GerarConviteState = { error?: string; url?: string; expiresAt?: string } | null

const EQUIPES_VALIDAS = new Set(['Alpha', 'Bravo', 'Charlie', 'Delta'])
const CONVITE_VALID_DAYS = 7

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

function publicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`
  return 'http://localhost:3000'
}

/** Gestão → Efetivo: gera link único para cadastro público no GAEP do administrador. */
export async function gerarConviteEfetivo(gaepId: string): Promise<GerarConviteState> {
  const id = gaepId.trim()
  if (!id) return { error: 'GAEP inválido.' }

  try {
    const user = await getSessionOrThrow()
    const admin = createAdminClient()

    const { data: op, error: opErr } = await admin
      .from('operadores')
      .select('id, gaep_id, perfil')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (opErr || !op) return { error: 'Operador não encontrado.' }
    const perfil = String(op.perfil)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(perfil)) return { error: 'Acesso negado.' }

    if (perfil === 'SUPER_ADMIN') {
      const { data: gRow, error: gErr } = await admin
        .from('gaeps')
        .select('id')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle<{ id: string }>()
      if (gErr || !gRow?.id) return { error: 'GAEP não encontrado ou indisponível.' }
    } else if (String(op.gaep_id) !== id) {
      return { error: 'GAEP inválido para o seu usuário.' }
    }

    const token = randomBytes(32).toString('base64url')
    const expires = new Date()
    expires.setDate(expires.getDate() + CONVITE_VALID_DAYS)

    const { error: insErr } = await admin.from('convites_operador').insert({
      gaep_id: id,
      token,
      created_by: String(op.id),
      expires_at: expires.toISOString(),
    })

    if (insErr) {
      if (insErr.message.includes('convites_operador') || insErr.code === '42P01') {
        return {
          error:
            'Tabela de convites ausente. Execute no Supabase o arquivo handoff/sql/005_convites_operador.sql.',
        }
      }
      return { error: insErr.message }
    }

    const url = `${publicBaseUrl()}/convite/${encodeURIComponent(token)}`
    return { url, expiresAt: expires.toISOString() }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export type ConviteSubmitState = { error?: string; ok?: boolean } | null

export async function submeterConviteEfetivo(
  _prev: ConviteSubmitState,
  formData: FormData
): Promise<ConviteSubmitState> {
  const token = String(formData.get('token') ?? '').trim()
  const nome = String(formData.get('nome') ?? '').trim()
  const nomeCompleto = String(formData.get('nome_completo') ?? '').trim()
  const matricula = String(formData.get('matricula') ?? '').trim()
  const senhaField = String(formData.get('senha') ?? '').trim()
  const equipe = String(formData.get('equipe') ?? '').trim()
  const numerica = String(formData.get('numerica') ?? '').trim()
  const tipoSanguineo = String(formData.get('tipo_sanguineo') ?? '').trim()
  const alergia = String(formData.get('alergia') ?? '').trim()
  const contatoEmergencia = String(formData.get('contato_emergencia') ?? '').trim()
  const nomeContatoEmergencia = String(formData.get('nome_contato_emergencia') ?? '').trim()
  const planoSaude = String(formData.get('plano_saude') ?? '').trim()
  const numeroCarteirinha = String(formData.get('numero_carteirinha') ?? '').trim()
  const cpf = String(formData.get('cpf') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()

  const complementosInput = {
    nomeCompleto,
    numerica,
    tipoSanguineo,
    alergia,
    contatoEmergencia,
    nomeContatoEmergencia,
    planoSaude,
    numeroCarteirinha,
    cpf,
    email,
  }

  const perfil = 'OPERADOR'

  if (!token || !nome || !matricula) {
    return { error: 'Preencha nome de guerra e matrícula.' }
  }
  const equipeFinal = equipe || 'Alpha'
  if (!EQUIPES_VALIDAS.has(equipeFinal)) {
    return { error: 'Equipe inválida.' }
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: convite, error: cErr } = await admin
    .from('convites_operador')
    .select('id, gaep_id, expires_at, used_at, created_by')
    .eq('token', token)
    .is('deleted_at', null)
    .maybeSingle()

  if (cErr) {
    if (cErr.message.includes('convites_operador') || cErr.code === '42P01') {
      return {
        error:
          'Convites não configurados no banco. Execute handoff/sql/005_convites_operador.sql no Supabase.',
      }
    }
    return { error: 'Não foi possível validar o convite.' }
  }
  if (!convite) return { error: 'Link de convite inválido ou expirado.' }
  if (convite.used_at) return { error: 'Este convite já foi utilizado.' }
  if (convite.expires_at && convite.expires_at < nowIso) {
    return { error: 'Este convite expirou. Solicite um novo link na gestão do GAEP.' }
  }

  const gaepId = String(convite.gaep_id)

  const { data: matUsada } = await admin
    .from('operadores')
    .select('id')
    .eq('matricula', matricula)
    .maybeSingle()
  if (matUsada) return { error: 'Esta matrícula já está cadastrada no sistema.' }

  const senhaAuth = senhaField || matricula
  const emailSistema = emailSistemaFromMatricula(matricula)
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: emailSistema,
    password: senhaAuth,
    email_confirm: true,
  })
  if (authErr) return { error: authErr.message }

  const authId = authData.user?.id
  if (!authId) {
    return { error: 'Falha ao criar usuário de autenticação.' }
  }

  const insertPayload = {
    gaep_id: gaepId,
    auth_id: authId,
    nome,
    nome_completo: nomeCompleto || null,
    matricula,
    perfil,
    equipe: equipeFinal,
    email_funcional: emailSistema,
    numerica: numerica || null,
    tipo_sanguineo: tipoSanguineo || null,
    alergia: alergia || null,
    contato_emergencia: contatoEmergencia || null,
    nome_contato_emergencia: nomeContatoEmergencia || null,
    plano_saude: planoSaude || null,
    numero_carteirinha: numeroCarteirinha || null,
    cpf: cpf || null,
    email: email || null,
    ativo: true,
  }

  let { data: dataRow, error } = await admin
    .from('operadores')
    .insert(insertPayload)
    .select('id')
    .single()

  const pediuCamposComplementares = hasCamposComplementares(complementosInput)

  if (error) {
    const retryWithoutNomeCompleto = await admin
      .from('operadores')
      .insert({
        gaep_id: gaepId,
        auth_id: authId,
        nome,
        matricula,
        perfil,
        equipe: equipeFinal,
        email_funcional: emailSistema,
        numerica: numerica || null,
        tipo_sanguineo: tipoSanguineo || null,
        alergia: alergia || null,
        contato_emergencia: contatoEmergencia || null,
        nome_contato_emergencia: nomeContatoEmergencia || null,
        plano_saude: planoSaude || null,
        numero_carteirinha: numeroCarteirinha || null,
        cpf: cpf || null,
        email: email || null,
        ativo: true,
      })
      .select('id')
      .single()
    dataRow = retryWithoutNomeCompleto.data
    error = retryWithoutNomeCompleto.error
  }

  if (error) {
    const fallbackInsert = await admin
      .from('operadores')
      .insert({
        gaep_id: gaepId,
        auth_id: authId,
        nome,
        matricula,
        perfil,
        equipe: equipeFinal,
        email_funcional: emailSistema,
        ativo: true,
      })
      .select('id')
      .single()
    dataRow = fallbackInsert.data
    error = fallbackInsert.error
  }

  if (error) {
    await admin.auth.admin.deleteUser(authId)
    return { error: error.message }
  }

  if (pediuCamposComplementares && !insertPayload.nome_completo && !dataRow?.id) {
    await admin.auth.admin.deleteUser(authId)
    return { error: 'Não foi possível salvar os campos complementares do operador.' }
  }

  if (pediuCamposComplementares) {
    const { data: validacao, error: valErr } = await admin
      .from('operadores')
      .select(
        'id, nome_completo, numerica, tipo_sanguineo, alergia, contato_emergencia, nome_contato_emergencia, plano_saude, numero_carteirinha, cpf, email, email_funcional'
      )
      .eq('id', String(dataRow?.id))
      .maybeSingle()
    if (valErr || !validacao) {
      await admin.auth.admin.deleteUser(authId)
      await admin
        .from('operadores')
        .update({ deleted_at: nowIso, ativo: false })
        .eq('id', String(dataRow?.id))
      return { error: 'Operador criado, mas não foi possível confirmar os campos complementares no banco.' }
    }
    const naoPersistiu =
      campoDivergiu(nomeCompleto, validacao.nome_completo) ||
      campoDivergiu(numerica, validacao.numerica) ||
      campoDivergiu(tipoSanguineo, validacao.tipo_sanguineo) ||
      campoDivergiu(alergia, validacao.alergia) ||
      campoDivergiu(contatoEmergencia, validacao.contato_emergencia) ||
      campoDivergiu(nomeContatoEmergencia, validacao.nome_contato_emergencia) ||
      campoDivergiu(planoSaude, validacao.plano_saude) ||
      campoDivergiu(numeroCarteirinha, validacao.numero_carteirinha) ||
      campoDivergiu(cpf, validacao.cpf) ||
      campoDivergiu(email, validacao.email)
    if (naoPersistiu) {
      await admin.auth.admin.deleteUser(authId)
      await admin
        .from('operadores')
        .update({ deleted_at: nowIso, ativo: false })
        .eq('id', String(dataRow?.id))
      return {
        error:
          'Campos complementares não persistiram. Aplique a migration de operadores no banco (nome_completo e demais colunas).',
      }
    }
  }

  if (!dataRow?.id) {
    await admin.auth.admin.deleteUser(authId)
    return { error: 'Não foi possível criar o operador.' }
  }

  const { error: useErr } = await admin
    .from('convites_operador')
    .update({ used_at: nowIso })
    .eq('id', convite.id)
    .is('used_at', null)

  if (useErr) {
    await admin.auth.admin.deleteUser(authId)
    await admin
      .from('operadores')
      .update({ deleted_at: nowIso, ativo: false })
      .eq('id', String(dataRow.id))
    return { error: 'Não foi possível finalizar o convite. Tente novamente.' }
  }

  revalidatePath('/gestao')
  logAudit({
    gaepId,
    operadorId: convite.created_by ? String(convite.created_by) : null,
    acao: 'CREATE',
    tabela: 'operadores',
    registroId: String(dataRow.id),
    dadosDepois: { nome, matricula, perfil, origem: 'convite_efetivo' },
  }).catch(() => {})

  return { ok: true }
}
