'use client'

/** Operador exibido como chip selecionável. */
interface Operador {
  id: string
  nome: string
}

interface EquipeChipsProps {
  operadores: Operador[]
  value: string[]
  onChange: (ids: string[]) => void
}

/**
 * Seletor de membros da equipe via chips clicáveis.
 *
 * - Chip "TODOS": sempre com borda #1a237e; ao clicar alterna todos/nenhum.
 * - Chips individuais: clique faz toggle individual e desativa "TODOS".
 * - Contador ao lado do label mostra quantos estão selecionados.
 */
export function EquipeChips({ operadores, value, onChange }: EquipeChipsProps) {
  const todosAtivos = value.length === operadores.length && operadores.length > 0

  function toggleTodos() {
    if (todosAtivos) {
      onChange([])
    } else {
      onChange(operadores.map((o) => o.id))
    }
  }

  function toggleMembro(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        Equipe GAEP
        <span style={{ float: 'right', color: '#1a237e', fontSize: '0.78rem', fontWeight: 700 }}>({value.length})</span>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={toggleTodos}
          aria-pressed={todosAtivos}
          style={{
            padding: '9px 14px',
            borderRadius: 30,
            fontSize: '0.87rem',
            fontWeight: 700,
            cursor: 'pointer',
            userSelect: 'none',
            background: todosAtivos ? '#1a237e' : 'rgba(26,35,126,0.05)',
            color: todosAtivos ? '#fff' : '#1a237e',
            border: '1px solid #1a237e',
            transition: '0.2s',
          }}
        >
          ✦ TODOS
        </button>
        {operadores.map((op) => {
          const ativo = value.includes(op.id)
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => toggleMembro(op.id)}
              aria-pressed={ativo}
              style={{
                padding: '9px 14px',
                borderRadius: 30,
                fontSize: '0.87rem',
                fontWeight: 600,
                cursor: 'pointer',
                userSelect: 'none',
                background: ativo ? '#1a237e' : '#fff',
                color: ativo ? '#fff' : '#64748b',
                border: '1px solid #e2e8f0',
                transition: '0.2s',
              }}
            >
              {op.nome}
            </button>
          )
        })}
      </div>
    </div>
  )
}
