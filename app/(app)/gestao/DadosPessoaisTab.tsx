'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { atualizarMeusDadosPessoais, alterarMinhaSenha } from './actions'
import { LEGENDA_REQUISITOS_SENHA_GAEP } from '@/lib/password-policy'
import { emailSistemaFromMatricula } from '@/lib/email-sistema'
import type { OperadorRow } from './GestaoClient'

const mInput: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: '0.9rem',
  outline: 'none',
  background: '#f8fafc',
  boxSizing: 'border-box',
  color: '#1e293b',
  fontFamily: 'inherit',
}

const lStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  letterSpacing: 0.5,
  marginBottom: 5,
}

const card: CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
}

export function DadosPessoaisTab({
  initial,
  perfil,
}: {
  initial: OperadorRow
  perfil: string
}) {
  const router = useRouter()
  const [pendingDados, startDados] = useTransition()
  const [pendingSenha, startSenha] = useTransition()
  const [msgDados, setMsgDados] = useState<{ ok: boolean; text: string } | null>(null)
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; text: string } | null>(null)

  const [nome, setNome] = useState(initial.nome)
  const [nomeCompleto, setNomeCompleto] = useState(initial.nome_completo ?? '')
  const [email, setEmail] = useState(initial.email ?? '')
  const [cpf, setCpf] = useState(initial.cpf ?? '')
  const [numerica, setNumerica] = useState(initial.numerica ?? '')
  const [tipoSanguineo, setTipoSanguineo] = useState(initial.tipo_sanguineo ?? '')
  const [alergia, setAlergia] = useState(initial.alergia ?? '')
  const [contatoEmergencia, setContatoEmergencia] = useState(initial.contato_emergencia ?? '')
  const [nomeContatoEmergencia, setNomeContatoEmergencia] = useState(initial.nome_contato_emergencia ?? '')
  const [planoSaude, setPlanoSaude] = useState(initial.plano_saude ?? '')
  const [numeroCarteirinha, setNumeroCarteirinha] = useState(initial.numero_carteirinha ?? '')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')

  function submitDados(e: FormEvent) {
    e.preventDefault()
    setMsgDados(null)
    startDados(async () => {
      const res = await atualizarMeusDadosPessoais({
        nome,
        nomeCompleto: nomeCompleto || undefined,
        email: email || undefined,
        cpf: cpf || undefined,
        numerica: numerica || undefined,
        tipoSanguineo: tipoSanguineo || undefined,
        alergia: alergia || undefined,
        contatoEmergencia: contatoEmergencia || undefined,
        nomeContatoEmergencia: nomeContatoEmergencia || undefined,
        planoSaude: planoSaude || undefined,
        numeroCarteirinha: numeroCarteirinha || undefined,
      })
      if (res.error) {
        setMsgDados({ ok: false, text: res.error })
        return
      }
      setMsgDados({ ok: true, text: 'Dados salvos com sucesso.' })
      router.refresh()
    })
  }

  function submitSenha(e: FormEvent) {
    e.preventDefault()
    setMsgSenha(null)
    startSenha(async () => {
      const res = await alterarMinhaSenha({
        senhaAtual,
        novaSenha,
        confirmacao: confirmSenha,
      })
      if (res.error) {
        setMsgSenha({ ok: false, text: res.error })
        return
      }
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmSenha('')
      setMsgSenha({ ok: true, text: 'Senha alterada. Use a nova senha no próximo acesso.' })
      router.refresh()
    })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a237e', margin: '0 0 14px 0' }}>
        Dados pessoais
      </h2>

      <form onSubmit={submitDados} style={card}>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          Atualize suas informações. Matrícula e perfil são definidos pelo cadastro da unidade.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="dp-matricula" style={lStyle}>
              Matrícula
            </label>
            <input id="dp-matricula" readOnly value={initial.matricula} style={{ ...mInput, background: '#e2e8f0', color: '#64748b' }} />
          </div>
          {perfil === 'SUPER_ADMIN' ? (
            <div>
              <label htmlFor="dp-email-sistema" style={lStyle}>
                E-mail do sistema
              </label>
              <input
                id="dp-email-sistema"
                readOnly
                tabIndex={-1}
                value={emailSistemaFromMatricula(initial.matricula)}
                style={{ ...mInput, background: '#e2e8f0', color: '#475569' }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                Gerado automaticamente a partir da matrícula (conta interna de autenticação).
              </p>
            </div>
          ) : null}
          <div>
            <label htmlFor="dp-perfil" style={lStyle}>
              Perfil
            </label>
            <input id="dp-perfil" readOnly value={initial.perfil} style={{ ...mInput, background: '#e2e8f0', color: '#64748b' }} />
          </div>
          <div>
            <label htmlFor="dp-nome" style={lStyle}>
              Nome de guerra
            </label>
            <input id="dp-nome" required value={nome} onChange={(ev) => setNome(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-nome-completo" style={lStyle}>
              Nome completo
            </label>
            <input id="dp-nome-completo" value={nomeCompleto} onChange={(ev) => setNomeCompleto(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-email" style={lStyle}>
              E-mail pessoal
            </label>
            <input id="dp-email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-cpf" style={lStyle}>
              CPF
            </label>
            <input id="dp-cpf" value={cpf} onChange={(ev) => setCpf(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-numerica" style={lStyle}>
              Numérica
            </label>
            <input id="dp-numerica" value={numerica} onChange={(ev) => setNumerica(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-tp" style={lStyle}>
              Tipo sanguíneo
            </label>
            <input id="dp-tp" value={tipoSanguineo} onChange={(ev) => setTipoSanguineo(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-alergia" style={lStyle}>
              Alergia
            </label>
            <input id="dp-alergia" value={alergia} onChange={(ev) => setAlergia(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-nome-ce" style={lStyle}>
              Nome contato emergência
            </label>
            <input
              id="dp-nome-ce"
              value={nomeContatoEmergencia}
              onChange={(ev) => setNomeContatoEmergencia(ev.target.value)}
              style={mInput}
            />
          </div>
          <div>
            <label htmlFor="dp-tel-ce" style={lStyle}>
              Contato emergência
            </label>
            <input id="dp-tel-ce" value={contatoEmergencia} onChange={(ev) => setContatoEmergencia(ev.target.value)} style={mInput} />
          </div>
          <div>
            <label htmlFor="dp-plano" style={lStyle}>
              Plano de saúde
            </label>
            <input
              id="dp-plano"
              value={planoSaude}
              onChange={(ev) => setPlanoSaude(ev.target.value)}
              placeholder="Ex. Unimed ou SUS"
              style={mInput}
            />
          </div>
          <div>
            <label htmlFor="dp-cart" style={lStyle}>
              Número carteirinha
            </label>
            <input id="dp-cart" value={numeroCarteirinha} onChange={(ev) => setNumeroCarteirinha(ev.target.value)} style={mInput} />
          </div>
        </div>

        {msgDados ? (
          <p
            role="status"
            style={{
              margin: '14px 0 0 0',
              fontSize: '0.82rem',
              color: msgDados.ok ? '#15803d' : '#dc2626',
            }}
          >
            {msgDados.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pendingDados}
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 44,
            padding: '12px 14px',
            borderRadius: 10,
            border: 'none',
            background: pendingDados ? '#94a3b8' : '#1a237e',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: pendingDados ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {pendingDados ? 'Salvando…' : 'Salvar dados'}
        </button>
      </form>

      <form onSubmit={submitSenha} style={card}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a237e', margin: '0 0 12px 0' }}>Alterar senha</h3>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          A senha fica no provedor de autenticação (Supabase Auth) e passa a valer em todos os próximos acessos.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="dp-senha-atual" style={lStyle}>
              Senha atual
            </label>
            <input
              id="dp-senha-atual"
              type="password"
              autoComplete="current-password"
              placeholder="Matrícula"
              value={senhaAtual}
              onChange={(ev) => setSenhaAtual(ev.target.value)}
              style={mInput}
            />
          </div>
          <div>
            <label htmlFor="dp-nova" style={lStyle}>
              Nova senha
            </label>
            <input
              id="dp-nova"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(ev) => setNovaSenha(ev.target.value)}
              style={mInput}
            />
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.4 }}>{LEGENDA_REQUISITOS_SENHA_GAEP}</p>
          </div>
          <div>
            <label htmlFor="dp-conf" style={lStyle}>
              Confirmação da nova senha
            </label>
            <input
              id="dp-conf"
              type="password"
              autoComplete="new-password"
              value={confirmSenha}
              onChange={(ev) => setConfirmSenha(ev.target.value)}
              style={mInput}
            />
          </div>
        </div>

        {msgSenha ? (
          <p
            role="status"
            style={{
              margin: '14px 0 0 0',
              fontSize: '0.82rem',
              color: msgSenha.ok ? '#15803d' : '#dc2626',
            }}
          >
            {msgSenha.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pendingSenha}
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 44,
            padding: '12px 14px',
            borderRadius: 10,
            border: 'none',
            background: pendingSenha ? '#94a3b8' : '#1a237e',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: pendingSenha ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {pendingSenha ? 'Alterando…' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}
