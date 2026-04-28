'use client'

import { useState } from 'react'

interface AreaRevisaoProps {
  descricaoRevisada: string
  onSalvar: (descricaoFinal: string, ocorrencias: string) => void
  salvando: boolean
}

/**
 * Área de revisão que aparece após o retorno da IA.
 *
 * - Exibe o texto revisado em textarea editável (operador pode ajustar).
 * - Textarea de observações para informações adicionais do turno.
 * - Botão "Salvar & Consolidar" chama `onSalvar` com o texto final e as obs.
 * - Animação fadeIn definida no globals.css.
 */
export function AreaRevisao({ descricaoRevisada, onSalvar, salvando }: AreaRevisaoProps) {
  const [descricaoFinal, setDescricaoFinal] = useState(descricaoRevisada)
  const [ocorrencias, setOcorrencias] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: '#f3f4f6',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  }

  return (
    <div
      style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: 20, animation: 'fadeIn .3s' }}
    >
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        Texto Oficial Revisado
      </label>
      <textarea
        rows={5}
        value={descricaoFinal}
        onChange={(e) => setDescricaoFinal(e.target.value)}
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', color: '#f97316', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        Observações sobre a Atividade
      </label>
      <textarea
        rows={2}
        value={ocorrencias}
        onChange={(e) => setOcorrencias(e.target.value)}
        placeholder="Ex: Informações relevantes extras..."
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      <button
        type="button"
        onClick={() => onSalvar(descricaoFinal, ocorrencias)}
        disabled={salvando}
        style={{
          width: '100%',
          padding: '14px',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontSize: '0.95rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: salvando ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
          background: salvando ? '#4a5568' : '#1a237e',
          transition: 'opacity .2s',
        }}
      >
        {salvando ? '⏳ Consolidando...' : 'Salvar & Consolidar Turno'}
      </button>
    </div>
  )
}
