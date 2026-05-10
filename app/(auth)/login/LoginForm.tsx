'use client'

import { useActionState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { loginAction, type LoginState } from './actions'

interface LoginFormProps {
  /** Deploy sem env do Supabase (ex.: build Vercel) — mensagem fixa para o administrador. */
  avisoAmbiente?: string
}

export function LoginForm({ avisoAmbiente }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

  // Limpa qualquer sessão/token stale do browser para evitar o erro
  // "Invalid Refresh Token" que causa Runtime Error [object Event]
  useEffect(() => {
    createClient().auth.signOut({ scope: 'local' }).catch(() => {})
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f2f2f2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 20px',
      }}
    >
      <Image
        src="/gaep-logo.png"
        alt="Logo GAEP"
        width={120}
        height={120}
        style={{
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.18))',
          marginBottom: '14px',
        }}
        priority
      />

      <h1
        style={{
          fontSize: '1.9rem',
          fontWeight: 900,
          letterSpacing: '2px',
          color: '#1a237e',
          margin: '0 0 4px 0',
        }}
      >
        GAEP
      </h1>

      <p
        style={{
          fontSize: '0.82rem',
          color: '#64748b',
          margin: '0 0 24px 0',
          textAlign: 'center',
        }}
      >
        Gestão de Atividades e Efetivo Policial
      </p>

      {avisoAmbiente ? (
        <p
          role="alert"
          style={{
            maxWidth: '420px',
            margin: '0 0 20px 0',
            padding: '12px 14px',
            fontSize: '0.8rem',
            lineHeight: 1.45,
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            textAlign: 'left',
          }}
        >
          {avisoAmbiente}
        </p>
      ) : null}

      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '28px 24px',
          maxWidth: '360px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input
              id="nome-guerra-input"
              name="nome_guerra"
              type="text"
              autoComplete="off"
              aria-label="Nome de guerra"
              placeholder="Nome de Guerra"
              required
              disabled={Boolean(avisoAmbiente)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.95rem',
                color: '#1e293b',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="senha-input"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              Senha
            </label>
            <input
              id="senha-input"
              name="senha"
              type="password"
              autoComplete="current-password"
              placeholder="Matrícula (primeiro acesso) ou senha alterada"
              required
              disabled={Boolean(avisoAmbiente)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.95rem',
                color: '#1e293b',
                outline: 'none',
              }}
            />
          </div>

          {state?.error && (
            <p
              role="alert"
              style={{
                fontSize: '0.82rem',
                color: '#ef4444',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || Boolean(avisoAmbiente)}
            style={{
              width: '100%',
              padding: '14px',
              background: isPending ? '#4a5568' : '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
              transition: 'background 0.2s',
            }}
          >
            {isPending ? '⏳ Verificando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
