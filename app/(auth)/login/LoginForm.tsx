'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { loginAction, type LoginState } from './actions'

interface Operador {
  id: string
  nome: string
  matricula: string
}

interface LoginFormProps {
  operadores: Operador[]
}

export function LoginForm({ operadores }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    null
  )

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
        GAEP-CAT
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
            <label
              htmlFor="operador-select"
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
              Operador
            </label>
            <select
              id="operador-select"
              name="matricula"
              required
              defaultValue=""
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.95rem',
                color: '#1e293b',
                background: '#fff',
                outline: 'none',
                appearance: 'auto',
              }}
            >
              <option value="" disabled>Selecione o operador</option>
              {operadores.map((op) => (
                <option key={op.id} value={op.matricula}>
                  {op.nome}
                </option>
              ))}
            </select>
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
              Matrícula / Senha
            </label>
            <input
              id="senha-input"
              name="senha"
              type="password"
              placeholder="Digite sua matrícula"
              required
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
            disabled={isPending}
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
