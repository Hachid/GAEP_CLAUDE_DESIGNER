import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RelatorioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f2f2f2',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
        }}
      >
        <h1 style={{ margin: 0, color: '#1a237e' }}>Acesso realizado com sucesso</h1>
        <p style={{ marginTop: '10px', color: '#334155' }}>
          Usuário autenticado: <strong>{user.email}</strong>
        </p>
      </section>
    </main>
  )
}
