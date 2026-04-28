'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  // ── 2. Validações mínimas de negócio ─────────────────────────
  if (!input.descricaoRevisada.trim()) {
    return { error: 'A descrição revisada não pode estar vazia.' }
  }
  if (!input.data) {
    return { error: 'A data da operação é obrigatória.' }
  }

  const admin = createAdminClient()
  let ip = 'unknown'

  try {
    const headerStore = await headers()
    ip = headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? 'unknown'
  } catch {
    // headers() pode falhar em contextos de teste
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
      fotos_urls: input.fotosUrls.length > 0 ? input.fotosUrls : null,
    })
    .select('id')
    .single()

  if (insertError || !relatorio) {
    console.error('[salvarRelatorio] Erro ao inserir relatorio:', insertError)
    return { error: insertError?.message ?? 'Falha ao salvar o relatório. Tente novamente.' }
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
  admin
    .from('audit_log')
    .insert({
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
    .then(() => {})
    .catch((err: unknown) => console.error('[salvarRelatorio] Erro no audit_log:', err))

  revalidatePath('/relatorio')
  return { id: relatorioId }
}
