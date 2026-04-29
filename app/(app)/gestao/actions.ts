'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionResult = { error?: string }
type CsvRow = Record<string, string>
type Alinhamento = 'left' | 'center' | 'right' | 'justify'

export interface BlocoEstiloRelatorio {
  fontFamily: string
  fontColor: string
  align: Alinhamento
  indent: number
  lineHeight: number
}

export interface ConfigRelatorioData {
  id: string | null
  tituloTexto: string
  descricaoTexto: string
  rodapeTexto: string
  tituloEstilo: BlocoEstiloRelatorio
  descricaoEstilo: BlocoEstiloRelatorio
  rodapeEstilo: BlocoEstiloRelatorio
}

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

export async function salvarConfigRelatorio(
  gaepId: string,
  operadorId: string,
  config: ConfigRelatorioData
): Promise<ActionResult> {
  try {
    const { admin } = await getAdminCtx()
    const { error } = await admin.from('config_relatorio').upsert(
      {
        gaep_id: gaepId,
        titulo_texto: config.tituloTexto.trim(),
        descricao_texto: config.descricaoTexto.trim(),
        rodape_texto: config.rodapeTexto.trim(),
        titulo_estilo: config.tituloEstilo,
        descricao_estilo: config.descricaoEstilo,
        rodape_estilo: config.rodapeEstilo,
        updated_by: operadorId,
        updated_at: new Date().toISOString(),
      },
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
      admin.from('atividades').select('id, nome, categoria_id').is('deleted_at', null),
      admin.from('gaeps').select('id, codigo'),
    ])

    if (opsRes.error || catRes.error || atRes.error || gaepsRes.error) {
      return { error: 'Falha ao carregar dicionários de referência para importação.' }
    }

    const gaepByCodigo = new Map((gaepsRes.data ?? []).map((g) => [String(g.codigo).toUpperCase(), String(g.id)]))
    const catByNome = new Map((catRes.data ?? []).map((c) => [String(c.nome).toUpperCase(), String(c.id)]))
    const opByMatricula = new Map((opsRes.data ?? []).map((o) => [String(o.matricula), { id: String(o.id), gaep_id: String(o.gaep_id) }]))
    const atvByCatNome = new Map(
      (atRes.data ?? []).map((a) => [`${String(a.categoria_id)}::${String(a.nome).toUpperCase()}`, String(a.id)])
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

      const atividadeId = atvByCatNome.get(`${categoriaId}::${atividadeNome}`)
      if (!atividadeId) {
        skipped += 1
        errors.push({ line, reason: 'atividade_nome não encontrada para a categoria informada.' })
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
