'use client'

interface BotoesAcaoProps {
  onSalvarDireto: () => void
  onRedigirIA: () => void
  iaLoading: boolean
  salvando: boolean
}

/**
 * Par de botões de ação do formulário de relatório.
 *
 * - "Salvar Direto": salva a descrição bruta sem passar pela IA.
 * - "Redigir com IA": envia para o GPT-4o e abre a AreaRevisao.
 * Ambos ficam desabilitados durante qualquer operação em andamento.
 */
export function BotoesAcao({ onSalvarDireto, onRedigirIA, iaLoading, salvando }: BotoesAcaoProps) {
  const disabled = iaLoading || salvando

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
      <button
        type="button"
        onClick={onSalvarDireto}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '14px',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontSize: '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: disabled ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
          background: disabled ? '#94a3b8' : '#64748b',
          transition: 'opacity .2s',
        }}
      >
        {salvando ? '⏳ Salvando...' : '💾 Salvar Direto'}
      </button>
      <button
        type="button"
        onClick={onRedigirIA}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '14px',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontSize: '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: disabled ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
          background: iaLoading ? '#93c5fd' : '#2563eb',
          transition: 'opacity .2s',
        }}
      >
        {iaLoading ? '⏳ Redigindo...' : '✨ Redigir com IA'}
      </button>
    </div>
  )
}
