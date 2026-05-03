import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { buscarHistoricoRelatorios } from '../actions'
import { HistoricoClient } from './HistoricoClient'
import { getCategorias, getAtividades } from '@/lib/cache/queries'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

export default async function HistoricoPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const admin = createAdminClient()
  let operadorAtual: OperadorComGaep | null = null

  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (byAuthId) {
    operadorAtual = byAuthId
  } else {
    const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''
    if (matricula) {
      const { data: byMatricula } = await admin
        .from('operadores')
        .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
        .eq('matricula', matricula)
        .is('deleted_at', null)
        .maybeSingle<OperadorComGaep>()
      if (byMatricula) operadorAtual = byMatricula
    }
  }

  if (!operadorAtual?.gaeps) redirect('/relatorio')

  const [historicoRes, categorias, atividades, opsRes] = await Promise.all([
    buscarHistoricoRelatorios(operadorAtual.gaeps.id),
    getCategorias(),
    getAtividades(),
    admin.from('operadores').select('id, nome').eq('gaep_id', operadorAtual.gaep_id).is('deleted_at', null).order('nome'),
  ])

  const relatorios = historicoRes.data ?? []
  const operadores = (opsRes.data ?? []) as { id: string; nome: string }[]

  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={operadorAtual.gaeps.nome}
        perfil={operadorAtual.perfil ?? 'OPERADOR'}
      />
      <main style={{ minHeight: '100vh', background: '#f3f4f6', padding: '74px 16px 20px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          <HistoricoClient
            relatorios={relatorios}
            categorias={categorias}
            atividades={atividades}
            operadores={operadores}
            perfil={operadorAtual.perfil ?? 'OPERADOR'}
            operadorId={operadorAtual.id}
          />
        </div>
      </main>
    </>
  )
}
