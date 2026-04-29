'use client'

type Operador = { id: string; nome: string }

type Props = {
  operadores: Operador[]
  value: string
  onChange: (id: string) => void
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

const selectStyle: React.CSSProperties = {
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

export function SeletorOperador({ operadores, value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>Selecionar Operador</label>
      <select style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione o Operador...</option>
        {operadores.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  )
}
