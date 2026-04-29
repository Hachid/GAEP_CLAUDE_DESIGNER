'use client'

export type TabTipo = 'mes' | 'periodo'

type Props = {
  tab: TabTipo
  onChange: (tab: TabTipo) => void
  mesSelecionado: string
  onMesChange: (mes: string) => void
  dataInicio: string
  onDataInicioChange: (d: string) => void
  dataFim: string
  onDataFimChange: (d: string) => void
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: '0.92rem',
  fontFamily: 'inherit',
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
}

export function TabsMesPeriodo({
  tab,
  onChange,
  mesSelecionado,
  onMesChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
}: Props) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          marginBottom: 14,
        }}
      >
        {(['mes', 'periodo'] as TabTipo[]).map((t, i) => (
          <div
            key={t}
            onClick={() => onChange(t)}
            role="tab"
            aria-selected={tab === t}
            style={{
              flex: 1,
              padding: '12px 8px',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              background: tab === t ? '#1a237e' : '#fff',
              color: tab === t ? '#fff' : '#64748b',
              transition: '0.2s',
              userSelect: 'none',
            }}
          >
            {i === 0 ? 'Mês Referência' : 'Período Exato'}
          </div>
        ))}
      </div>

      {tab === 'mes' ? (
        <div>
          <label style={labelStyle}>Mês e Ano</label>
          <input
            type="month"
            value={mesSelecionado}
            onChange={(e) => onMesChange(e.target.value)}
            style={inputStyle}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  )
}
