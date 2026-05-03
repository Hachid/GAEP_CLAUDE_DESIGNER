'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeFotosUrls } from '@/lib/pdf/normalizeFotosUrls'
import { getSessionOrThrow } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'

/** Campos necessários para registrar um relatório operacional. */
export interface SalvarRelatorioInput {
  gaepId: string
  relatoristId: string
  data: string
  horaInicio: string
  horaFim: string
  horasTotais: number
  categoriaId: string
  atividadeId: string
  outrosIntegrantes: string
  descricaoBruta: string
  descricaoRevisada: string
  ocorrencias: string
  fotosUrls: string[]
  /** IDs dos operadores participantes. */
  equipe: string[]
}

/** Resultado da operação de salvamento. */
export interface SalvarRelatorioResult {
  id?: string
  error?: string
}

/**
 * Regras de obrigatoriedade para persistência de relatório.
 * Mantém validação defensiva no backend (além da validação do formulário).
 */
function validarObrigatoriosSalvarRelatorio(input: SalvarRelatorioInput): string | null {
  if (!input.data) return 'Data da operação é obrigatória.'
  if (!input.horaInicio || !input.horaFim) return 'Horário inicial e final são obrigatórios.'
  if (!input.categoriaId) return 'Categoria da operação é obrigatória.'
  if (!input.atividadeId) return 'Atividade da operação é obrigatória.'
  if (!Array.isArray(input.equipe) || input.equipe.length === 0) {
    return 'Selecione ao menos um operador na equipe.'
  }
  return null
}

const GAEP_FOTOS_BUCKET = 'gaep-fotos'
const MAX_RELATORIO_FOTO_BYTES = 6 * 1024 * 1024

function dataIsoParaSlugRelatorioFoto(dataProp: string): string {
  const t = dataProp.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split('-')
    return `${d}-${m}-${y}`
  }
  const hoje = new Date().toISOString().split('T')[0]
  const [y, m, d] = hoje.split('-')
  return `${d}-${m}-${y}`
}

function slugFotoSegment(s: string): string {
  const t = s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase()
  return t || 'GERAL'
}

function extensaoImagemSegura(fileName: string): string {
  const raw = (fileName.split('.').pop() ?? 'jpg').toLowerCase()
  const ok = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']
  if (ok.includes(raw)) return raw === 'jpeg' ? 'jpg' : raw
  return 'jpg'
}

async function resolverOperadorGaepCodigoParaFoto(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string | undefined
): Promise<string | null> {
  const { data: byAuthId } = await admin
    .from('operadores')
    .select('gaeps(id, nome:codigo)')
    .eq('auth_id', userId)
    .is('deleted_at', null)
    .maybeSingle<{ gaeps: { nome: string } | null }>()

  if (byAuthId?.gaeps?.nome) return byAuthId.gaeps.nome

  const matricula = email?.replace('@gaep.internal', '').trim() ?? ''
  if (!matricula) return null

  const { data: byMatricula } = await admin
    .from('operadores')
    .select('gaeps(id, nome:codigo)')
    .eq('matricula', matricula)
    .is('deleted_at', null)
    .maybeSingle<{ gaeps: { nome: string } | null }>()

  return byMatricula?.gaeps?.nome ?? null
}

export type UploadRelatorioFotoResult = { url?: string; error?: string }

/**
 * Upload de foto do relatório via serviço (contorna RLS do Storage no browser).
 * O caminho no bucket usa sempre o código do GAEP do operador autenticado no servidor.
 */
export async function uploadRelatorioFoto(formData: FormData): Promise<UploadRelatorioFotoResult> {
  let user
  try {
    user = await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { error: 'Arquivo inválido.' }
  }
  if (!file.size || file.size > MAX_RELATORIO_FOTO_BYTES) {
    return { error: 'A imagem deve ter no máximo 6 MB.' }
  }
  if (!file.type.startsWith('image/')) {
    return { error: 'Envie apenas uma imagem.' }
  }

  const data = String(formData.get('data') ?? '').trim()
  const categoria = String(formData.get('categoria') ?? '')
  const atividade = String(formData.get('atividade') ?? '')
  const indice = Number.parseInt(String(formData.get('indice') ?? '1'), 10)
  if (!Number.isFinite(indice) || indice < 1 || indice > 3) {
    return { error: 'Índice da foto inválido.' }
  }

  const admin = createAdminClient()
  const codigoGaep = await resolverOperadorGaepCodigoParaFoto(admin, user.id, user.email ?? undefined)
  if (!codigoGaep) {
    return { error: 'Operador não encontrado.' }
  }

  const dateStr = dataIsoParaSlugRelatorioFoto(data)
  const catSlug = slugFotoSegment(categoria)
  const atSlug = slugFotoSegment(atividade)
  const ext = extensaoImagemSegura(file.name)
  const objectPath = `${codigoGaep.toLowerCase()}/fotos/${dateStr}_${catSlug}_${atSlug}_${indice}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { data: up, error: upErr } = await admin.storage
    .from(GAEP_FOTOS_BUCKET)
    .upload(objectPath, buf, { contentType: file.type || 'image/jpeg', upsert: true })

  if (upErr || !up) {
    console.error('[uploadRelatorioFoto] Storage:', upErr?.message)
    return { error: upErr?.message ?? 'Falha ao enviar a foto.' }
  }

  const { data: pub } = admin.storage.from(GAEP_FOTOS_BUCKET).getPublicUrl(up.path)
  return { url: pub.publicUrl }
}

/**
 * Server Action — salva um relatório operacional no Supabase.
 *
 * Ordem das operações:
 * 1. Valida a sessão do usuário.
 * 2. Insere o registro em `relatorios`.
 * 3. Insere participantes em `relatorio_participantes`.
 * 4. Registra entrada em `audit_log` (imutável).
 * 5. Revalida a rota `/relatorio` para refletir novos dados.
 *
 * Usa o admin client para bypassar RLS nas inserções (o RLS já foi
 * validado na camada de autenticação).
 */
export async function salvarRelatorio(
  input: SalvarRelatorioInput
): Promise<SalvarRelatorioResult> {
  // ── 1. Validar autenticação ───────────────────────────────────
  try {
    await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  // ── 2. Validações mínimas de negócio ─────────────────────────
  const erroObrigatorios = validarObrigatoriosSalvarRelatorio(input)
  if (erroObrigatorios) {
    return { error: `⚠️ ${erroObrigatorios}` }
  }
  if (!input.descricaoRevisada.trim()) {
    return { error: 'A descrição revisada não pode estar vazia.' }
  }
  if (input.descricaoBruta.length > 5000) {
    return { error: 'Descrição dos fatos excede 5.000 caracteres.' }
  }
  if (input.descricaoRevisada.length > 5000) {
    return { error: 'Descrição revisada excede 5.000 caracteres.' }
  }
  if (input.ocorrencias.length > 1000) {
    return { error: 'Observações excedem 1.000 caracteres.' }
  }
  if (input.outrosIntegrantes.length > 500) {
    return { error: 'Outros integrantes excede 500 caracteres.' }
  }

  const admin = createAdminClient()
  let ip = 'unknown'

  try {
    const headerStore = await headers()
    ip = headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? 'unknown'
  } catch {
    // headers() pode falhar em contextos de teste
  }

  const fotosParaGravar = normalizeFotosUrls(input.fotosUrls)
  if (process.env.NODE_ENV === 'development') {
    console.log('[RELATORIO][save] fotos antes do submit (raw length):', input.fotosUrls?.length)
    console.log('[RELATORIO][save] fotos normalizadas count:', fotosParaGravar.length)
    console.log('[RELATORIO][save] payload fotos_urls:', fotosParaGravar.length > 0 ? fotosParaGravar : null)
  }

  // ── 3. Inserir relatório ──────────────────────────────────────
  const { data: relatorio, error: insertError } = await admin
    .from('relatorios')
    .insert({
      gaep_id: input.gaepId,
      relatorista_id: input.relatoristId,
      data: input.data,
      hora_inicio: input.horaInicio || null,
      hora_fim: input.horaFim || null,
      horas_totais: input.horasTotais > 0 ? input.horasTotais : null,
      categoria_id: input.categoriaId || null,
      atividade_id: input.atividadeId || null,
      outros_integrantes: input.outrosIntegrantes.trim() || null,
      descricao_bruta: input.descricaoBruta.trim() || null,
      descricao_revisada: input.descricaoRevisada.trim(),
      ocorrencias: input.ocorrencias.trim() || null,
      fotos_urls: fotosParaGravar.length > 0 ? fotosParaGravar : null,
    })
    .select('id, fotos_urls')
    .single()

  if (insertError || !relatorio) {
    console.error('[salvarRelatorio] Erro ao inserir relatorio:', insertError)
    return { error: insertError?.message ?? 'Falha ao salvar o relatório. Tente novamente.' }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[RELATORIO][save] insert result fotos_urls:', (relatorio as { fotos_urls?: unknown }).fotos_urls)
  }

  const relatorioId = relatorio.id as string

  // ── 4. Inserir participantes ──────────────────────────────────
  if (input.equipe.length > 0) {
    const { error: partError } = await admin.from('relatorio_participantes').insert(
      input.equipe.map((operadorId) => ({
        relatorio_id: relatorioId,
        operador_id: operadorId,
        hora_inicio: input.horaInicio || null,
        hora_fim: input.horaFim || null,
        horas_totais: input.horasTotais > 0 ? input.horasTotais : null,
      }))
    )

    if (partError) {
      // Não cancela o fluxo — o relatório foi salvo; apenas loga o erro
      console.error('[salvarRelatorio] Erro ao inserir participantes:', partError)
    }
  }

  // ── 5. Audit log (fire-and-forget — nunca bloqueia o retorno) ─
  void (async () => {
    const { error: auditErr } = await admin.from('audit_log').insert({
      gaep_id: input.gaepId,
      operador_id: input.relatoristId,
      acao: 'INSERT',
      tabela: 'relatorios',
      registro_id: relatorioId,
      dados_depois: {
        data: input.data,
        categoria_id: input.categoriaId,
        atividade_id: input.atividadeId,
        horas_totais: input.horasTotais,
        equipe_count: input.equipe.length,
      },
      ip,
    })
    if (auditErr) console.error('[salvarRelatorio] Erro no audit_log:', auditErr)
  })()

  revalidatePath('/relatorio')
  revalidateTag('relatorios-kpi')
  return { id: relatorioId }
}

// ── Tipos para visualização e histórico ──────────────────────

export interface RelatorioDetalhado {
  id: string
  gaep_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  horas_totais: number | null
  descricao_bruta: string | null
  descricao_revisada: string
  ocorrencias: string | null
  fotos_urls: string[] | null
  outros_integrantes: string | null
  versao: number
  created_at: string
  updated_at: string
  categoria_nome: string | null
  atividade_nome: string | null
  relatorista_nome: string | null
  participantes: Array<{ id: string; nome: string }>
  versoes: Array<{
    id: string
    versao: number
    descricao_anterior: string | null
    descricao_nova: string | null
    motivo: string | null
    editado_por_nome: string | null
    created_at: string
  }>
}

export interface RelatorioResumo {
  id: string
  data: string
  hora_inicio: string
  hora_fim: string
  horas_totais: number | null
  categoria_id: string | null
  atividade_id: string | null
  categoria_nome: string | null
  atividade_nome: string | null
  versao: number
  created_at: string
  relatorista_id: string | null
  relatorista_nome: string | null
}

/** Busca os detalhes completos de um relatório pelo ID. */
export async function buscarRelatorio(
  id: string
): Promise<{ data?: RelatorioDetalhado; error?: string }> {
  try {
    await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada.' }
  }

  const admin = createAdminClient()

  const { data: rel, error: relErr } = await admin
    .from('relatorios')
    .select(
      'id, gaep_id, data, hora_inicio, hora_fim, horas_totais, categoria_id, atividade_id, relatorista_id, descricao_bruta, descricao_revisada, ocorrencias, fotos_urls, outros_integrantes, versao, created_at, updated_at'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (relErr || !rel) return { error: 'Relatório não encontrado.' }

  const relRow = rel as Record<string, unknown>

  // Busca categoria, atividade e relatorista em paralelo
  const [catRes, atvRes, relRes, partRes, verRes] = await Promise.all([
    relRow.categoria_id
      ? admin.from('categorias_atividade').select('nome').eq('id', relRow.categoria_id).single()
      : Promise.resolve({ data: null }),
    relRow.atividade_id
      ? admin.from('atividades').select('nome').eq('id', relRow.atividade_id).single()
      : Promise.resolve({ data: null }),
    relRow.relatorista_id
      ? admin.from('operadores').select('nome').eq('id', relRow.relatorista_id).single()
      : Promise.resolve({ data: null }),
    admin.from('relatorio_participantes').select('operador_id').eq('relatorio_id', id),
    admin
      .from('relatorio_versoes')
      .select('id, versao, descricao_anterior, descricao_nova, motivo, editado_por_id, created_at')
      .eq('relatorio_id', id)
      .order('versao', { ascending: false }),
  ])

  // IDs para lookups de nomes — calculados primeiro, queries em paralelo
  const participanteIds = ((partRes.data ?? []) as Array<{ operador_id: string }>).map(
    (p) => p.operador_id
  )
  const versoesBruto = ((verRes.data ?? []) as Array<Record<string, unknown>>)
  const editorIds = [...new Set(versoesBruto.map((v) => v.editado_por_id as string).filter(Boolean))]

  const [partOpsRes, edOpsRes] = await Promise.all([
    participanteIds.length > 0
      ? admin.from('operadores').select('id, nome').in('id', participanteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
    editorIds.length > 0
      ? admin.from('operadores').select('id, nome').in('id', editorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string }> }),
  ])

  const participantes = ((partOpsRes.data ?? []) as Array<{ id: string; nome: string }>).map(
    (o) => ({ id: o.id, nome: o.nome })
  )
  const editorMap: Record<string, string> = Object.fromEntries(
    ((edOpsRes.data ?? []) as Array<{ id: string; nome: string }>).map((e) => [e.id, e.nome])
  )

  const versoes = versoesBruto.map((v) => ({
    id: v.id as string,
    versao: v.versao as number,
    descricao_anterior: (v.descricao_anterior as string) ?? null,
    descricao_nova: (v.descricao_nova as string) ?? null,
    motivo: (v.motivo as string) ?? null,
    editado_por_nome: v.editado_por_id ? (editorMap[v.editado_por_id as string] ?? null) : null,
    created_at: v.created_at as string,
  }))

  const catData = catRes.data as { nome: string } | null
  const atvData = atvRes.data as { nome: string } | null
  const relData = relRes.data as { nome: string } | null
  const fotosNorm = normalizeFotosUrls(relRow.fotos_urls)

  return {
    data: {
      id: relRow.id as string,
      gaep_id: relRow.gaep_id as string,
      data: relRow.data as string,
      hora_inicio: relRow.hora_inicio as string,
      hora_fim: relRow.hora_fim as string,
      horas_totais: (relRow.horas_totais as number) ?? null,
      descricao_bruta: (relRow.descricao_bruta as string) ?? null,
      descricao_revisada: relRow.descricao_revisada as string,
      ocorrencias: (relRow.ocorrencias as string) ?? null,
      fotos_urls: fotosNorm.length > 0 ? fotosNorm : null,
      outros_integrantes: (relRow.outros_integrantes as string) ?? null,
      versao: relRow.versao as number,
      created_at: relRow.created_at as string,
      updated_at: relRow.updated_at as string,
      categoria_nome: catData?.nome ?? null,
      atividade_nome: atvData?.nome ?? null,
      relatorista_nome: relData?.nome ?? null,
      participantes,
      versoes,
    },
  }
}

/** Busca o histórico de relatórios do GAEP (sem deleted). */
export async function buscarHistoricoRelatorios(
  gaepId: string
): Promise<{ data?: RelatorioResumo[]; error?: string }> {
  try {
    await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada.' }
  }

  const admin = createAdminClient()

  const { data: rows, error: rowsErr } = await admin
    .from('relatorios')
    .select('id, data, hora_inicio, hora_fim, horas_totais, categoria_id, atividade_id, relatorista_id, versao, created_at')
    .eq('gaep_id', gaepId)
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (rowsErr) return { error: rowsErr.message }

  const relRows = ((rows ?? []) as Array<Record<string, unknown>>)

  // Busca todos os nomes em batch
  const catIds = [...new Set(relRows.map((r) => r.categoria_id as string).filter(Boolean))]
  const atvIds = [...new Set(relRows.map((r) => r.atividade_id as string).filter(Boolean))]
  const relIds = [...new Set(relRows.map((r) => r.relatorista_id as string).filter(Boolean))]

  const [catsRes, atvsRes, relNamesRes] = await Promise.all([
    catIds.length > 0
      ? admin.from('categorias_atividade').select('id, nome').in('id', catIds)
      : Promise.resolve({ data: [] }),
    atvIds.length > 0
      ? admin.from('atividades').select('id, nome').in('id', atvIds)
      : Promise.resolve({ data: [] }),
    relIds.length > 0
      ? admin.from('operadores').select('id, nome').in('id', relIds)
      : Promise.resolve({ data: [] }),
  ])

  const catMap = Object.fromEntries(
    ((catsRes.data ?? []) as Array<{ id: string; nome: string }>).map((c) => [c.id, c.nome])
  )
  const atvMap = Object.fromEntries(
    ((atvsRes.data ?? []) as Array<{ id: string; nome: string }>).map((a) => [a.id, a.nome])
  )
  const relMap = Object.fromEntries(
    ((relNamesRes.data ?? []) as Array<{ id: string; nome: string }>).map((o) => [o.id, o.nome])
  )

  const data: RelatorioResumo[] = relRows.map((r) => ({
    id: r.id as string,
    data: r.data as string,
    hora_inicio: r.hora_inicio as string,
    hora_fim: r.hora_fim as string,
    horas_totais: (r.horas_totais as number) ?? null,
    categoria_id: (r.categoria_id as string) ?? null,
    atividade_id: (r.atividade_id as string) ?? null,
    categoria_nome: r.categoria_id ? (catMap[r.categoria_id as string] ?? null) : null,
    atividade_nome: r.atividade_id ? (atvMap[r.atividade_id as string] ?? null) : null,
    versao: r.versao as number,
    created_at: r.created_at as string,
    relatorista_id: (r.relatorista_id as string) ?? null,
    relatorista_nome: r.relatorista_id ? (relMap[r.relatorista_id as string] ?? null) : null,
  }))

  return { data }
}

export interface EditarRelatorioInput {
  id: string
  descricaoRevisada: string
  motivo: string
  operadorId: string
}

/** Edita a descrição de um relatório, criando registro de versão. Admin/SuperAdmin apenas. */
export async function editarRelatorio(
  input: EditarRelatorioInput
): Promise<{ error?: string }> {
  try {
    await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada.' }
  }
  if (!input.descricaoRevisada.trim()) return { error: 'A descrição não pode estar vazia.' }

  const admin = createAdminClient()

  // Verifica perfil do operador
  const { data: op } = await admin
    .from('operadores')
    .select('perfil')
    .eq('id', input.operadorId)
    .single()

  const perfilOp = (op as { perfil: string } | null)?.perfil ?? ''
  if (!['ADMIN', 'SUPER_ADMIN'].includes(perfilOp)) {
    return { error: 'Apenas administradores podem editar relatórios.' }
  }

  // Busca descrição atual para versionar
  const { data: atual, error: atualErr } = await admin
    .from('relatorios')
    .select('descricao_revisada, versao')
    .eq('id', input.id)
    .is('deleted_at', null)
    .single()

  if (atualErr || !atual) return { error: 'Relatório não encontrado.' }

  const atualRow = atual as { descricao_revisada: string; versao: number }
  const novaVersao = atualRow.versao + 1

  // Insere versão anterior
  await admin.from('relatorio_versoes').insert({
    relatorio_id: input.id,
    editado_por_id: input.operadorId,
    versao: atualRow.versao,
    descricao_anterior: atualRow.descricao_revisada,
    descricao_nova: input.descricaoRevisada.trim(),
    motivo: input.motivo.trim() || null,
  })

  // Atualiza relatório
  const { error: updErr } = await admin
    .from('relatorios')
    .update({
      descricao_revisada: input.descricaoRevisada.trim(),
      versao: novaVersao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)

  if (updErr) return { error: updErr.message }

  revalidatePath(`/relatorio/${input.id}`)
  revalidatePath('/relatorio/historico')
  revalidateTag('relatorios-kpi')
  return {}
}

/** Realiza soft delete de um relatório. Admin/SuperAdmin apenas. */
export async function excluirRelatorio(input: {
  id: string
  operadorId: string
}): Promise<{ error?: string }> {
  try {
    await getSessionOrThrow()
  } catch {
    return { error: 'Sessão expirada.' }
  }

  const admin = createAdminClient()

  const { data: op } = await admin
    .from('operadores')
    .select('perfil')
    .eq('id', input.operadorId)
    .single()

  const perfilOp = (op as { perfil: string } | null)?.perfil ?? ''
  if (!['ADMIN', 'SUPER_ADMIN'].includes(perfilOp)) {
    return { error: 'Apenas administradores podem excluir relatórios.' }
  }

  const { error: delErr } = await admin
    .from('relatorios')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.id)

  if (delErr) return { error: delErr.message }

  revalidatePath('/relatorio/historico')
  revalidateTag('relatorios-kpi')
  return {}
}
