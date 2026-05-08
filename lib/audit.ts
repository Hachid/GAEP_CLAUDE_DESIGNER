import { createAdminClient } from '@/lib/supabase/admin'

export type AcaoAudit = 'ACESSO' | 'CREATE' | 'UPDATE' | 'DELETE'

export async function logAudit(params: {
  gaepId: string | null
  operadorId: string | null
  acao: AcaoAudit
  tabela?: string
  registroId?: string
  dadosAntes?: Record<string, unknown>
  dadosDepois?: Record<string, unknown>
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      gaep_id: params.gaepId ?? null,
      operador_id: params.operadorId ?? null,
      acao: params.acao,
      tabela: params.tabela ?? null,
      registro_id: params.registroId ?? null,
      dados_antes: params.dadosAntes ?? null,
      dados_depois: params.dadosDepois ?? null,
    })
  } catch {
    // nunca propaga erro — log é melhor-esforço
  }
}
