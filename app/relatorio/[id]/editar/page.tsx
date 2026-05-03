import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { buscarRelatorio } from '../../actions'
import { RelatorioEditarForm } from './RelatorioEditarForm'
import { getCategorias, getAtividades } from '@/lib/cache/queries'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

interface OperadorSimples {
  id: string
  nome: string
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RelatorioEditarPage({ params }: Props) {
  const { id } = await params

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

  const bundle = await buscarRelatorio(id)
  if (bundle.error || !bundle.data) notFound()

  const relatorio = bundle.data
  if (relatorio.gaep_id !== operadorAtual.gaep_id) notFound()

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(operadorAtual.perfil ?? '')
  const isRelatorista = relatorio.relatorista_id === operadorAtual.id
  if (!isAdmin && !isRelatorista) notFound()

  const [opRes, categorias, atividades] = await Promise.all([
    admin
      .from('operadores')
      .select('id, nome_guerra:nome')
      .eq('gaep_id', operadorAtual.gaep_id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome'),
    getCategorias(),
    getAtividades(),
  ])

  const operadores: OperadorSimples[] = ((opRes.data ?? []) as Array<{ id: string; nome_guerra: string }>).map(
    (o) => ({ id: o.id, nome: o.nome_guerra })
  )

  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={operadorAtual.gaeps.nome}
        perfil={operadorAtual.perfil ?? 'OPERADOR'}
      />
      <main style={{ minHeight: '100vh', background: '#f3f4f6', padding: '74px 16px 20px' }}>
        <div style={{ maxWidth: 430, margin: '0 auto' }}>
          <RelatorioEditarForm
            relatorio={relatorio}
            operadorAtual={{ id: operadorAtual.id, nome: operadorAtual.nome_guerra }}
            gaepCodigo={operadorAtual.gaeps.nome}
            operadores={operadores}
            categorias={categorias}
            atividades={atividades}
          />
        </div>
      </main>
    </>
  )
}
