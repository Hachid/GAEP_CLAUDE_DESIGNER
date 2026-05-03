import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: 'inherit',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '4rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>404</p>
      <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#475569', marginTop: 8 }}>
        Página não encontrada
      </p>
      <p style={{ color: '#94a3b8', marginTop: 8, maxWidth: 360 }}>
        O endereço acessado não existe ou foi removido.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 28,
          padding: '12px 28px',
          background: '#1a237e',
          color: '#fff',
          borderRadius: 10,
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.95rem',
        }}
      >
        Ir para o painel
      </Link>
    </div>
  )
}
