'use client'

import { useActionState, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  submeterConviteEfetivo,
  type ConviteSubmitState,
} from '@/app/convite/actions'

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.95rem',
  color: '#1e293b',
  outline: 'none',
  minHeight: 44,
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
}

const sectionTitle: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 800,
  color: '#1a237e',
  margin: '16px 0 8px 0',
  paddingBottom: 6,
  borderBottom: '1px solid #e2e8f0',
}

const grid2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
}

interface ConviteFormProps {
  token: string
  gaepLabel: string
}

export function ConviteForm({ token, gaepLabel }: ConviteFormProps) {
  const [state, formAction, isPending] = useActionState<
    ConviteSubmitState,
    FormData
  >(submeterConviteEfetivo, null)

  if (state?.ok) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '28px 24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', margin: '0 0 12px 0' }}>
          Cadastro concluído
        </p>
        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          No login, use o <strong>nome de guerra</strong> e a <strong>senha</strong> que você definiu
          (se deixou a senha em branco, a senha é a <strong>matrícula</strong>).
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '12px 22px',
            background: '#1a237e',
            color: '#fff',
            borderRadius: '10px',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.95rem',
            minHeight: 44,
          }}
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '24px 20px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.45 }}>
        Cadastro no efetivo de <strong style={{ color: '#1e293b' }}>{gaepLabel}</strong>. Preencha os
        mesmos campos do cadastro na gestão. O cadastro entra como <strong>OPERADOR</strong>; só o Super Admin
        altera permissões depois. Conta interna <strong>matrícula@gaep.internal</strong>; no login use{' '}
        <strong>nome de guerra</strong> e a <strong>senha</strong> (em branco = matrícula).
      </p>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input type="hidden" name="token" value={token} />

        <div style={sectionTitle}>Identificação</div>
        <div>
          <label htmlFor="convite-nome" style={labelStyle}>
            Nome de guerra
          </label>
          <input
            id="convite-nome"
            name="nome"
            type="text"
            required
            autoComplete="nickname"
            placeholder="Como será exibido no sistema"
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="convite-nome-completo" style={labelStyle}>
            Nome completo
          </label>
          <input
            id="convite-nome-completo"
            name="nome_completo"
            type="text"
            autoComplete="name"
            placeholder="Nome civil completo (opcional)"
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="convite-matricula" style={labelStyle}>
            Matrícula
          </label>
          <input
            id="convite-matricula"
            name="matricula"
            type="text"
            required
            autoComplete="off"
            placeholder="Sua matrícula"
            style={fieldStyle}
          />
        </div>
        <div style={sectionTitle}>Acesso</div>
        <div>
          <label htmlFor="convite-senha" style={labelStyle}>
            Senha inicial (opcional)
          </label>
          <input
            id="convite-senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            placeholder="Em branco = usar a matrícula como senha"
            style={fieldStyle}
          />
        </div>
        <input type="hidden" name="equipe" value="Alpha" />

        <div style={sectionTitle}>Dados complementares</div>
        <div>
          <label htmlFor="convite-numerica" style={labelStyle}>
            Numérica
          </label>
          <input
            id="convite-numerica"
            name="numerica"
            type="text"
            placeholder="01"
            style={fieldStyle}
          />
        </div>
        <div style={grid2}>
          <div>
            <label htmlFor="convite-tipo-sanguineo" style={labelStyle}>
              Tipo sanguíneo
            </label>
            <input
              id="convite-tipo-sanguineo"
              name="tipo_sanguineo"
              type="text"
              placeholder="Ex.: O+"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="convite-alergia" style={labelStyle}>
              Alergia
            </label>
            <input
              id="convite-alergia"
              name="alergia"
              type="text"
              placeholder="Ex.: Dipirona"
              style={fieldStyle}
            />
          </div>
        </div>
        <div>
          <label htmlFor="convite-contato-emergencia" style={labelStyle}>
            Contato de emergência
          </label>
          <input
            id="convite-contato-emergencia"
            name="contato_emergencia"
            type="text"
            placeholder="Ex.: (44) 99999-9999"
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="convite-nome-contato" style={labelStyle}>
            Nome do contato
          </label>
          <input
            id="convite-nome-contato"
            name="nome_contato_emergencia"
            type="text"
            placeholder="Nome completo"
            style={fieldStyle}
          />
        </div>
        <div style={grid2}>
          <div>
            <label htmlFor="convite-plano" style={labelStyle}>
              Plano de saúde
            </label>
            <input
              id="convite-plano"
              name="plano_saude"
              type="text"
              placeholder="Ex. Unimed ou SUS"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="convite-carteirinha" style={labelStyle}>
              Nº da carteirinha
            </label>
            <input
              id="convite-carteirinha"
              name="numero_carteirinha"
              type="text"
              style={fieldStyle}
            />
          </div>
        </div>
        <div style={grid2}>
          <div>
            <label htmlFor="convite-cpf" style={labelStyle}>
              CPF
            </label>
            <input
              id="convite-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              placeholder="Somente números"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="convite-email" style={labelStyle}>
              E-mail pessoal
            </label>
            <input
              id="convite-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nome@dominio.com"
              style={fieldStyle}
            />
          </div>
        </div>

        {state?.error ? (
          <p role="alert" style={{ fontSize: '0.82rem', color: '#ef4444', margin: 0, textAlign: 'center' }}>
            {state.error}
          </p>
        ) : null}
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
            marginTop: '8px',
            minHeight: 48,
          }}
        >
          {isPending ? 'Enviando…' : 'Concluir cadastro'}
        </button>
      </form>
    </div>
  )
}
