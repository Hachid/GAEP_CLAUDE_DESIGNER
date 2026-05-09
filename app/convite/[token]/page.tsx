import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConviteForm } from './ConviteForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token: raw } = await params
  const token = decodeURIComponent(raw ?? '').trim()

  if (!token) {
    return <ConviteInvalido motivo="Link incompleto." />
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: convite, error } = await admin
    .from('convites_operador')
    .select('id, expires_at, used_at, gaeps(codigo, cidade, estado)')
    .eq('token', token)
    .is('deleted_at', null)
    .maybeSingle()

  if (error?.message?.includes('convites_operador') || error?.code === '42P01') {
    return (
      <ConviteInvalido motivo="Convites ainda não foram configurados no banco de dados (migration pendente)." />
    )
  }

  if (!convite) {
    return <ConviteInvalido motivo="Este link não é válido." />
  }
  if (convite.used_at) {
    return <ConviteInvalido motivo="Este convite já foi utilizado." />
  }
  if (convite.expires_at && convite.expires_at < nowIso) {
    return <ConviteInvalido motivo="Este convite expirou. Peça um novo link ao gestor do GAEP." />
  }

  const rawGaep = convite.gaeps as
    | { codigo: string; cidade: string; estado: string }
    | { codigo: string; cidade: string; estado: string }[]
    | null
  const g = Array.isArray(rawGaep) ? rawGaep[0] ?? null : rawGaep
  const gaepLabel = g ? `${g.codigo} — ${g.cidade}/${g.estado}` : 'GAEP'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f2f2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 16px',
      }}
    >
      <Image
        src="/gaep-logo.png"
        alt="Logo GAEP"
        width={96}
        height={96}
        style={{ objectFit: 'contain', marginBottom: '12px' }}
        priority
      />
      <h1
        style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          color: '#1a237e',
          margin: '0 0 20px 0',
          textAlign: 'center',
        }}
      >
        Cadastro no efetivo
      </h1>
      <ConviteForm token={token} gaepLabel={gaepLabel} />
    </div>
  )
}

function ConviteInvalido({ motivo }: { motivo: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f2f2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.95rem', color: '#b91c1c', fontWeight: 700, margin: '0 0 8px 0' }}>
          Convite indisponível
        </p>
        <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{motivo}</p>
      </div>
    </div>
  )
}
