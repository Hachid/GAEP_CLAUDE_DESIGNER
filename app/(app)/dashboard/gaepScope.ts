import { createAdminClient } from '@/lib/supabase/admin'
import { DASHBOARD_ANALISE_TODOS_GAEPS } from './types'

/** Chave estável para cache / PDF quando há vários GAEPs. */
export function gaepIdsToCacheKey(gaepIds: string[]): string {
  return [...new Set(gaepIds)].sort().join(',')
}

export async function resolveAnaliseGaepIds(
  admin: ReturnType<typeof createAdminClient>,
  perfil: string,
  operadorGaepId: string,
  analiseGaepId?: string
): Promise<string[]> {
  if (perfil !== 'SUPER_ADMIN') {
    return [operadorGaepId]
  }
  const raw = analiseGaepId?.trim()
  if (!raw) {
    return [operadorGaepId]
  }
  if (raw === DASHBOARD_ANALISE_TODOS_GAEPS) {
    const { data } = await admin.from('gaeps').select('id').is('deleted_at', null)
    const ids = (data ?? []).map((r: { id: string }) => String(r.id))
    return ids.length > 0 ? ids : [operadorGaepId]
  }
  const { data: one } = await admin
    .from('gaeps')
    .select('id')
    .eq('id', raw)
    .is('deleted_at', null)
    .maybeSingle<{ id: string }>()
  if (one?.id) return [String(one.id)]
  return [operadorGaepId]
}
