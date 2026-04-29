export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { DesempenhoClient } from './DesempenhoClient'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

interface OperadorLista {
  id: string
  nome_guerra: string
}

export default async function DesempenhoPage() {
  // ── 1. Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const admin = createAdminClient()

  // ── 2. Lookup do operador ─────────────────────────────────────
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
      if (byMatricula) {
        operadorAtual = byMatricula
        admin
          .from('operadores')
          .update({ auth_id: user.id })
          .eq('id', byMatricula.id)
          .then(() => {})
      }
    }
  }

  if (!operadorAtual) redirect('/relatorio')
  const gaep = operadorAtual.gaeps
  if (!gaep) redirect('/relatorio')

  // ── 3. Lista de operadores do GAEP ────────────────────────────
  const { data: opList } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome')
    .eq('gaep_id', gaep.id)
    .is('deleted_at', null)
    .order('nome')

  const operadores = ((opList ?? []) as OperadorLista[]).map((o) => ({
    id: o.id,
    nome: o.nome_guerra,
  }))

  // ── 4. Render ─────────────────────────────────────────────────
  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={gaep.nome}
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
            DESEMPENHO INDIVIDUAL
          </div>
          <DesempenhoClient
            operadores={operadores}
            operadorInicialId={operadorAtual.id}
          />
        </div>
      </main>
    </>
  )
}
