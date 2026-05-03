'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
    import('@sentry/react')
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {})
  }, [error])

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
      <p style={{ fontSize: '3rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>!</p>
      <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginTop: 8 }}>
        Ocorreu um erro inesperado
      </p>
      <p style={{ color: '#94a3b8', marginTop: 8, maxWidth: 400 }}>
        {error.message || 'Tente novamente. Se o problema persistir, contate o suporte.'}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 28,
          padding: '12px 28px',
          background: '#1a237e',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.95rem',
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
