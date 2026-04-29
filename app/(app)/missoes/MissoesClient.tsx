'use client'

import { useMemo, useState, useTransition } from 'react'
import { registrarMissao, editarObservacaoMissao, excluirMissao } from './actions'

// ── Tipos ─────────────────────────────────────────────────────

export interface OperadorOption {
  id: string
  nome: string
}

export interface TipoMissaoOption {
  id: string
  tipo: string
  valor: number
}

export interface MissaoRow {
  id: string
  operadorId: string
  operadorNome: string
  tipoMissaoId: string
  tipoSnapshot: string
  qtd: number
  valorUnitarioSnapshot: number
  valorTotal: number
  observacao: string | null
  createdAt: string
}

export interface MissoesClientProps {
  operadores: OperadorOption[]
  tiposMissao: TipoMissaoOption[]
  missoes: MissaoRow[]
  operadorAtualId: string
}

// ── Estilos compartilhados ────────────────────────────────────

const mInput: React.CSSProperties = {
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

const lStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  letterSpacing: 0.5,
  marginBottom: 5,
}

// ── Helpers ───────────────────────────────────────────────────

function fmtMoeda(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Sub-componentes ───────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  const isErr = msg.startsWith('❌')
  return (
    <div
      style={{
        background: isErr ? '#fee2e2' : '#dcfce7',
        border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`,
        color: isErr ? '#991b1b' : '#166534',
        padding: '10px 14px',
        borderRadius: 10,
        marginBottom: 12,
        fontWeight: 700,
        fontSize: '0.85rem',
      }}
    >
      {msg}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Formulário de registro ────────────────────────────────────

interface FormProps {
  operadores: OperadorOption[]
  tiposMissao: TipoMissaoOption[]
  operadorAtualId: string
  onRegistrada: (missao: MissaoRow) => void
  onToast: (msg: string) => void
}

function FormRegistro({ operadores, tiposMissao, operadorAtualId, onRegistrada, onToast }: FormProps) {
  const operadorInicial = operadores.find((o) => o.id === operadorAtualId) ?? operadores[0]
  const [form, setForm] = useState({
    operadorId: operadorInicial?.id ?? '',
    tipoMissaoId: tiposMissao[0]?.id ?? '',
    qtd: 1,
    observacao: '',
  })
  const [operadorBusca, setOperadorBusca] = useState(operadorInicial?.nome ?? '')
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [pending, start] = useTransition()

  const tipoSelecionado = tiposMissao.find((t) => t.id === form.tipoMissaoId)
  const valorPreview = tipoSelecionado ? form.qtd * tipoSelecionado.valor : 0
  const operadoresFiltrados = useMemo(() => {
    const termo = operadorBusca.trim().toLowerCase()
    if (!termo) return operadores.slice(0, 8)
    return operadores.filter((o) => o.nome.toLowerCase().includes(termo)).slice(0, 8)
  }, [operadorBusca, operadores])

  function selecionarOperador(op: OperadorOption) {
    setForm((f) => ({ ...f, operadorId: op.id }))
    setOperadorBusca(op.nome)
    setShowSugestoes(false)
  }

  function salvar() {
    if (!form.operadorId || !form.tipoMissaoId || form.qtd < 1) return
    if (!tipoSelecionado) return
    start(async () => {
      const res = await registrarMissao({
        operadorId: form.operadorId,
        tipoMissaoId: form.tipoMissaoId,
        tipoSnapshot: tipoSelecionado.tipo,
        qtd: form.qtd,
        valorUnitarioSnapshot: tipoSelecionado.valor,
        observacao: form.observacao,
      })
      if (res.error) { onToast(`❌ ${res.error}`); return }
      const op = operadores.find((o) => o.id === form.operadorId)
      onRegistrada({
        id: res.id!,
        operadorId: form.operadorId,
        operadorNome: op?.nome ?? '—',
        tipoMissaoId: form.tipoMissaoId,
        tipoSnapshot: tipoSelecionado.tipo,
        qtd: form.qtd,
        valorUnitarioSnapshot: tipoSelecionado.valor,
        valorTotal: valorPreview,
        observacao: form.observacao.trim() || null,
        createdAt: new Date().toISOString(),
      })
      onToast('✅ Missão registrada!')
      setForm((f) => ({ ...f, qtd: 1, observacao: '' }))
    })
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>✈️</span>
        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Registrar Missão/Diária
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <FormField label="Operador">
          <div style={{ position: 'relative' }}>
            <input
              value={operadorBusca}
              onChange={(e) => {
                const valor = e.target.value
                setOperadorBusca(valor)
                setForm((f) => ({ ...f, operadorId: '' }))
                setShowSugestoes(true)
              }}
              onFocus={() => setShowSugestoes(true)}
              onBlur={() => setTimeout(() => setShowSugestoes(false), 120)}
              style={mInput}
              placeholder="Digite o nome do operador..."
              autoComplete="off"
            />
            {showSugestoes && operadoresFiltrados.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
                  zIndex: 20,
                  overflow: 'hidden',
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {operadoresFiltrados.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onMouseDown={() => selecionarOperador(op)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: form.operadorId === op.id ? 'rgba(26,35,126,0.08)' : '#fff',
                      color: '#1e293b',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                    }}
                  >
                    {op.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <FormField label="Tipo de Diária">
            <select
              value={form.tipoMissaoId}
              onChange={(e) => setForm((f) => ({ ...f, tipoMissaoId: e.target.value }))}
              style={mInput}
            >
              {tiposMissao.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tipo} — {fmtMoeda(t.valor)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Qtd. Diárias">
            <input
              type="number"
              min={1}
              max={99}
              value={form.qtd}
              onChange={(e) => setForm((f) => ({ ...f, qtd: Math.max(1, parseInt(e.target.value) || 1) }))}
              style={mInput}
            />
          </FormField>
        </div>

        {/* Preview do valor */}
        {tipoSelecionado && (
          <div
            style={{
              background: 'rgba(22,163,74,0.07)',
              border: '1px solid rgba(22,163,74,0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
              {form.qtd} × {fmtMoeda(tipoSelecionado.valor)}
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>
              {fmtMoeda(valorPreview)}
            </span>
          </div>
        )}

        <FormField label="Observação (opcional)">
          <textarea
            value={form.observacao}
            onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            rows={3}
            placeholder="Detalhes da missão, destino, período..."
            style={{ ...mInput, resize: 'vertical', lineHeight: 1.5 }}
          />
        </FormField>

        <button
          onClick={salvar}
          disabled={pending || !form.operadorId || !form.tipoMissaoId}
          style={{
            width: '100%',
            padding: 14,
            background: pending ? '#94a3b8' : '#1a237e',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: pending ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? '⏳ Registrando...' : '✅ Registrar Missão'}
        </button>
      </div>
    </div>
  )
}

// ── Card de missão individual ─────────────────────────────────

interface MissaoCardProps {
  missao: MissaoRow
  onEdited: (id: string, obs: string) => void
  onDeleted: (id: string) => void
  onToast: (msg: string) => void
}

function MissaoCard({ missao, onEdited, onDeleted, onToast }: MissaoCardProps) {
  const [editando, setEditando] = useState(false)
  const [obsEdit, setObsEdit] = useState(missao.observacao ?? '')
  const [pending, start] = useTransition()

  function salvarEdicao() {
    start(async () => {
      const res = await editarObservacaoMissao(missao.id, obsEdit)
      if (res.error) { onToast(`❌ ${res.error}`); return }
      onEdited(missao.id, obsEdit.trim())
      setEditando(false)
      onToast('✅ Observação atualizada!')
    })
  }

  function handleExcluir() {
    start(async () => {
      const res = await excluirMissao(missao.id)
      if (res.error) { onToast(`❌ ${res.error}`); return }
      onDeleted(missao.id)
      onToast('🗑️ Missão removida.')
    })
  }

  return (
    <div
      style={{
        borderBottom: '1px solid #f1f5f9',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Tipo badge */}
        <div
          style={{
            background: 'rgba(26,35,126,0.07)',
            borderRadius: 8,
            padding: '6px 10px',
            textAlign: 'center',
            flexShrink: 0,
            minWidth: 56,
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#1a237e', fontWeight: 800, textTransform: 'uppercase' }}>
            {missao.qtd}×
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, marginTop: 1 }}>
            {fmtData(missao.createdAt)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
              {missao.tipoSnapshot}
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#16a34a', flexShrink: 0 }}>
              {fmtMoeda(missao.valorTotal)}
            </span>
          </div>

          {!editando && missao.observacao && (
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
              {missao.observacao}
            </div>
          )}

          {editando && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={obsEdit}
                onChange={(e) => setObsEdit(e.target.value)}
                rows={3}
                autoFocus
                style={{ ...mInput, resize: 'vertical', fontSize: '0.82rem', lineHeight: 1.5 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                <button
                  onClick={salvarEdicao}
                  disabled={pending}
                  style={{
                    padding: '7px 0',
                    background: pending ? '#94a3b8' : '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: pending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pending ? '⏳...' : '✅ Salvar'}
                </button>
                <button
                  onClick={() => { setEditando(false); setObsEdit(missao.observacao ?? '') }}
                  style={{
                    padding: '7px 0',
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!editando && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                onClick={() => setEditando(true)}
                disabled={pending}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(37,99,235,0.08)',
                  color: '#2563eb',
                  border: '1px solid rgba(37,99,235,0.2)',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                ✏️ Editar obs.
              </button>
              <button
                onClick={handleExcluir}
                disabled={pending}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: pending ? 'not-allowed' : 'pointer',
                }}
              >
                🗑️ Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Accordion por operador ────────────────────────────────────

interface OperadorGroup {
  operadorId: string
  operadorNome: string
  missoes: MissaoRow[]
  totalGeral: number
}

interface AccordionProps {
  group: OperadorGroup
  onEdited: (id: string, obs: string) => void
  onDeleted: (id: string) => void
  onToast: (msg: string) => void
  rank: number
}

function OperadorAccordion({ group, onEdited, onDeleted, onToast, rank }: AccordionProps) {
  const [open, setOpen] = useState(false)

  const MEDAL = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 16px',
          background: open ? 'rgba(26,35,126,0.04)' : '#fff',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(26,35,126,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1rem',
            color: '#1a237e',
            flexShrink: 0,
          }}
        >
          {group.operadorNome[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {MEDAL && <span style={{ fontSize: '1rem' }}>{MEDAL}</span>}
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
              {group.operadorNome}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
            {group.missoes.length} missão{group.missoes.length !== 1 ? 'ões' : ''} registrada{group.missoes.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#16a34a' }}>
            {fmtMoeda(group.totalGeral)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>total</div>
        </div>

        <span
          style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            marginLeft: 4,
          }}
        >
          ▼
        </span>
      </button>

      {/* Lista expandida */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          {group.missoes.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Nenhuma missão registrada
            </div>
          ) : (
            group.missoes.map((m) => (
              <MissaoCard
                key={m.id}
                missao={m}
                onEdited={onEdited}
                onDeleted={onDeleted}
                onToast={onToast}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export function MissoesClient({ operadores, tiposMissao, missoes: initialMissoes, operadorAtualId }: MissoesClientProps) {
  const [missoes, setMissoes] = useState<MissaoRow[]>(initialMissoes)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function handleRegistrada(nova: MissaoRow) {
    setMissoes((prev) => [nova, ...prev])
  }

  function handleEdited(id: string, obs: string) {
    setMissoes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, observacao: obs || null } : m))
    )
  }

  function handleDeleted(id: string) {
    setMissoes((prev) => prev.filter((m) => m.id !== id))
  }

  // Agrupa por operador e ordena pelo total (ranking)
  const groupMap = new Map<string, OperadorGroup>()
  for (const m of missoes) {
    const existing = groupMap.get(m.operadorId)
    if (existing) {
      existing.missoes.push(m)
      existing.totalGeral += m.valorTotal
    } else {
      groupMap.set(m.operadorId, {
        operadorId: m.operadorId,
        operadorNome: m.operadorNome,
        missoes: [m],
        totalGeral: m.valorTotal,
      })
    }
  }

  // Operadores sem missões ficam no fim do ranking
  for (const op of operadores) {
    if (!groupMap.has(op.id)) {
      groupMap.set(op.id, {
        operadorId: op.id,
        operadorNome: op.nome,
        missoes: [],
        totalGeral: 0,
      })
    }
  }

  const ranking = [...groupMap.values()].sort((a, b) => b.totalGeral - a.totalGeral)

  const totalGaep = missoes.reduce((s, m) => s + m.valorTotal, 0)

  return (
    <div style={{ paddingBottom: 30 }}>
      <Toast msg={toast} />

      <FormRegistro
        operadores={operadores}
        tiposMissao={tiposMissao}
        operadorAtualId={operadorAtualId}
        onRegistrada={handleRegistrada}
        onToast={showToast}
      />

      {/* Cabeçalho do ranking */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          padding: '0 2px',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          🏆 Ranking de Diárias
        </span>
        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          Total GAEP:{' '}
          <span style={{ color: '#16a34a', fontWeight: 900 }}>{fmtMoeda(totalGaep)}</span>
        </span>
      </div>

      {ranking.map((group, idx) => (
        <OperadorAccordion
          key={group.operadorId}
          group={group}
          rank={idx}
          onEdited={handleEdited}
          onDeleted={handleDeleted}
          onToast={showToast}
        />
      ))}

      {ranking.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 32,
            color: '#94a3b8',
            fontSize: '0.88rem',
          }}
        >
          Nenhuma missão registrada ainda.
        </div>
      )}
    </div>
  )
}
