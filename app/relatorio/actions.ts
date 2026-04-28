'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
  equipe: string[]
}

export interface SalvarRelatorioResult {
  id?: string
  error?: string
}

export async function salvarRelatorio(
  input: SalvarRelatorioInput
): Promise<SalvarRelatorioResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for') ?? 'unknown'

  const { data: relatorio, error } = await admin
    .from('relatorios')
    .insert({
      gaep_id: input.gaepId,
      relatorista_id: input.relatoristId,
      data: input.data,
      hora_inicio: input.horaInicio,
      hora_fim: input.horaFim,
      horas_totais: input.horasTotais,
      categoria_id: input.categoriaId || null,
      atividade_id: input.atividadeId || null,
      outros_integrantes: input.outrosIntegrantes || null,
      descricao_bruta: input.descricaoBruta || null,
      descricao_revisada: input.descricaoRevisada,
      ocorrencias: input.ocorrencias || null,
      fotos_urls: input.fotosUrls.length > 0 ? input.fotosUrls : null,
    })
    .select('id')
    .single()

  if (error || !relatorio) {
    return { error: error?.message ?? 'Erro ao salvar relatório.' }
  }

  if (input.equipe.length > 0) {
    await admin.from('relatorio_participantes').insert(
      input.equipe.map((operadorId) => ({
        relatorio_id: relatorio.id as string,
        operador_id: operadorId,
        hora_inicio: input.horaInicio || null,
        hora_fim: input.horaFim || null,
        horas_totais: input.horasTotais > 0 ? input.horasTotais : null,
      }))
    )
  }

  await admin.from('audit_log').insert({
    gaep_id: input.gaepId,
    operador_id: input.relatoristId,
    acao: 'INSERT',
    tabela: 'relatorios',
    registro_id: relatorio.id as string,
    dados_depois: {
      data: input.data,
      categoria_id: input.categoriaId,
      atividade_id: input.atividadeId,
      equipe: input.equipe,
    },
    ip,
  })

  revalidatePath('/relatorio')
  return { id: relatorio.id as string }
}
