import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RelatorioForm } from './RelatorioForm'
import { SidebarNav } from '@/components/layout/SidebarNav'

/** Formato retornado pelo Supabase ao selecionar operador com join de gaeps. */
interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
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

/**
 * Página principal de Registro Operacional.
 *
 * Fluxo de lookup do operador:
 * 1. Tenta localizar pelo `auth_id` (link direto Auth → Operador).
 * 2. Se não achar, tenta pela matrícula extraída do email `matricula@gaep.internal`.
 * 3. Ao achar pela matrícula, escreve o `auth_id` para acelerar lookups futuros.
 * 4. Se nenhum operador for encontrado, exibe mensagem de configuração pendente
 *    em vez de redirecionar para /login (o que causaria loop).
 */
export default async function RelatorioPage() {
  // ── 1. Autenticação ───────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const admin = createAdminClient()

  // ── 2. Lookup do operador (auth_id → matrícula) ───────────────
  let operadorAtual: OperadorComGaep | null = null

  try {
    // Tentativa 1: pelo auth_id (rápido — O(1) pelo índice)
    const { data: byAuthId } = await admin
      .from('operadores')
      .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, codigo)')
      .eq('auth_id', user.id)
      .is('deleted_at', null)
      .maybeSingle<OperadorComGaep>()

    if (byAuthId) {
      operadorAtual = byAuthId
    } else {
      // Tentativa 2: pelo email (matricula@gaep.internal)
      const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''

      if (matricula) {
        const { data: byMatricula } = await admin
          .from('operadores')
          .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, codigo)')
          .eq('matricula', matricula)
          .is('deleted_at', null)
          .maybeSingle<OperadorComGaep>()

        if (byMatricula) {
          operadorAtual = byMatricula
          // Vincula auth_id para acelerar próximos acessos (fire-and-forget)
          admin
            .from('operadores')
            .update({ auth_id: user.id })
            .eq('id', byMatricula.id)
            .then(() => {})
        }
      }
    }
  } catch (err) {
    console.error('[RelatorioPage] Erro ao buscar operador:', err)
  }

  // ── 3. Sem operador cadastrado — exibe aviso em vez de loop ───
  if (!operadorAtual) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f3f4f6',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 400,
            background: '#fff',
            borderRadius: 16,
            padding: '28px 24px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: '#1a237e', marginBottom: 8, fontSize: '1.1rem' }}>
            Operador não configurado
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.6 }}>
            O usuário <strong>{user.email}</strong> não possui um operador vinculado no sistema.
            Peça ao administrador para cadastrar seu perfil no GAEP.
          </p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                background: '#1a237e',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sair
            </button>
          </form>
        </div>
      </main>
    )
  }

  // ── 4. GAEP não vinculado ao operador ─────────────────────────
  const gaep = operadorAtual.gaeps
  if (!gaep) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f3f4f6',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 400,
            background: '#fff',
            borderRadius: 16,
            padding: '28px 24px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚙️</div>
          <h2 style={{ color: '#1a237e', marginBottom: 8, fontSize: '1.1rem' }}>
            GAEP não associado
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
            O operador <strong>{operadorAtual.nome_guerra}</strong> não está vinculado a nenhum
            GAEP. Contate o administrador.
          </p>
        </div>
      </main>
    )
  }

  // ── 5. Busca dados do formulário em paralelo ──────────────────
  let operadores: OperadorSimples[] = []
  let categorias: CategoriaRow[] = []
  let atividades: AtividadeRow[] = []

  try {
    const [opRes, catRes, atRes] = await Promise.all([
      admin
        .from('operadores')
        .select('id, nome_guerra:nome')
        .eq('gaep_id', gaep.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome'),
      admin.from('categorias_atividade').select('id, nome').order('nome'),
      admin
        .from('atividades')
        .select('id, nome, categoria_id')
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome'),
    ])

    operadores = (opRes.data ?? []).map((o: { id: string; nome_guerra: string }) => ({
      id: o.id,
      nome: o.nome_guerra,
    }))
    categorias = catRes.data ?? []
    atividades = atRes.data ?? []
  } catch (err) {
    console.error('[RelatorioPage] Erro ao buscar dados do formulário:', err)
  }

  // ── 6. Renderização ───────────────────────────────────────────
  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={gaep.codigo}
        perfil={operadorAtual.perfil ?? 'OPERADOR'}
      />
      <main
        style={{
          minHeight: '100vh',
          background: '#f3f4f6',
          padding: '74px 16px 20px',
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
            operadorAtual={{ id: operadorAtual.id, nome: operadorAtual.nome_guerra }}
            gaepId={gaep.id}
            gaepCodigo={gaep.codigo}
            operadores={operadores}
            categorias={categorias}
            atividades={atividades}
          />
        </div>
      </main>
    </>
  )
}
