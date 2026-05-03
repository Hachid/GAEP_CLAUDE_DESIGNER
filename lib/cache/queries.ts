import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Dados de referência global (sem filtro por GAEP) ──────────
// Categorias e atividades são compartilhadas por todos os GEAPs.
// TTL: 10 min. Invalidados via revalidateTag('atividades-lookup')
// quando uma atividade/categoria é criada, editada ou removida.

export const getCategorias = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('categorias_atividade')
      .select('id, nome')
      .order('nome')
    return (data ?? []) as Array<{ id: string; nome: string }>
  },
  ['categorias-atividade'],
  { revalidate: 600, tags: ['atividades-lookup'] }
)

export const getAtividades = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('atividades')
      .select('id, nome')
      .is('deleted_at', null)
      .order('nome')
    return (data ?? []) as Array<{ id: string; nome: string }>
  },
  ['atividades-lista'],
  { revalidate: 600, tags: ['atividades-lookup'] }
)
