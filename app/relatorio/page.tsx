import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RelatorioForm } from './RelatorioForm'

interface OperadorRow {
  id: string
  nome: string
  gaep_id: string
  gaeps: { id: string; codigo: string } | null
}

interface OperadorSimples {
  id: string
  nome: string
}

interface CategoriaRow {
  id: string
  nome: string
}

interface AtividadeRow {
  id: string
  nome: string
  categoria_id: string
}

export default async function RelatorioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: operadorAtual } = await admin
    .from('operadores')
    .select('id, nome, gaep_id, gaeps(id, codigo)')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .single<OperadorRow>()

  if (!operadorAtual?.gaeps) redirect('/login')

  const gaep = operadorAtual.gaeps

  const [{ data: operadores }, { data: categorias }, { data: atividades }] = await Promise.all([
    admin
      .from('operadores')
      .select('id, nome')
      .eq('gaep_id', gaep.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .returns<OperadorSimples[]>(),
    admin.from('categorias_atividade').select('id, nome').returns<CategoriaRow[]>(),
    admin
      .from('atividades')
      .select('id, nome, categoria_id')
      .eq('ativo', true)
      .is('deleted_at', null)
      .returns<AtividadeRow[]>(),
  ])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: '20px 16px',
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        <div
          style={{
            textAlign: 'center',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#1a237e',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: 14,
            marginBottom: 22,
            letterSpacing: 0.3,
          }}
        >
          REGISTRO OPERACIONAL
        </div>
        <RelatorioForm
          operadorAtual={{ id: operadorAtual.id, nome: operadorAtual.nome }}
          gaepId={gaep.id}
          gaepCodigo={gaep.codigo}
          operadores={operadores ?? []}
          categorias={categorias ?? []}
          atividades={atividades ?? []}
        />
      </div>
    </main>
  )
}
