'use client'

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  criarOperador,
  editarOperador,
  toggleAtivoOperador,
  adicionarAtividade,
  removerAtividade,
  adicionarFeriado,
  removerFeriado,
  salvarConfigIA,
  testarPromptIA,
  editarDiaria,
  adicionarGaep,
  toggleAtivoGaep,
  importarRelatoriosCsv,
} from './actions'

// ── Tipos públicos ────────────────────────────────────────────

export interface OperadorRow {
  id: string
  nome: string
  matricula: string
  perfil: string
  equipe: string | null
  ativo: boolean
  email_funcional: string | null
}

export interface AtividadeRow {
  id: string
  nome: string
  categoria_id: string
}

export interface FeriadoRow {
  id: string
  data: string
  descricao: string
}

export interface ConfigIAData {
  id: string | null
  modelo: string
  temperatura: number
  prompt: string
}

export interface DiariaRow {
  id: string
  tipo: string
  locais: string
  valor: number
  vigencia: string
}

export interface GaepRow {
  id: string
  codigo: string
  cidade: string
  estado: string
  ativo: boolean
}

export interface GestaoData {
  operadorAtual: { id: string; nome: string; perfil: string }
  gaep: { id: string; codigo: string; cidade: string; estado: string }
  operadores: OperadorRow[]
  categorias: { id: string; nome: string }[]
  atividades: AtividadeRow[]
  feriados: FeriadoRow[]
  configIA: ConfigIAData
  diarias: DiariaRow[]
  gaeps: GaepRow[]
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

// ── Helpers de formato ────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function fmtMoeda(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

// ── Componentes auxiliares ────────────────────────────────────

const PERFIL_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN: '#1a237e',
  SUPERVISOR: '#0369a1',
  OPERADOR: '#16a34a',
  AUDITOR: '#92400e',
}

function Tag({ perfil }: { perfil: string }) {
  const color = PERFIL_COLORS[perfil] ?? '#64748b'
  return (
    <span
      style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 20,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {perfil}
    </span>
  )
}

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

function AdminCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: 14,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}
    >
      <span
        style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {title}
      </span>
      {action}
    </div>
  )
}

function AddBtn({ onClick, label = '+ Adicionar', disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        background: disabled ? '#94a3b8' : '#1a237e',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '0.75rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function ActionBtn({
  onClick,
  color = '#2563eb',
  children,
  disabled,
}: {
  onClick: () => void
  color?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        background: `${color}12`,
        color: disabled ? '#94a3b8' : color,
        border: `1px solid ${color}30`,
        borderRadius: 6,
        fontWeight: 700,
        fontSize: '0.72rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginLeft: 4,
      }}
    >
      {children}
    </button>
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1a237e',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Tab: Efetivo ──────────────────────────────────────────────

const PERFIS = ['OPERADOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN', 'AUDITOR']
const EQUIPES = ['Alpha', 'Bravo', 'Charlie', 'Delta']

type ModalMode = 'add' | OperadorRow | null

function TabEfetivo({ gaepId, initial }: { gaepId: string; initial: OperadorRow[] }) {
  const [ops, setOps] = useState<OperadorRow[]>(initial)
  const [modal, setModal] = useState<ModalMode>(null)
  const [form, setForm] = useState({ nome: '', matricula: '', senha: '', perfil: 'OPERADOR', equipe: 'Alpha' })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openAdd() {
    setForm({ nome: '', matricula: '', senha: '', perfil: 'OPERADOR', equipe: 'Alpha' })
    setModal('add')
  }

  function openEdit(op: OperadorRow) {
    setForm({ nome: op.nome, matricula: op.matricula, senha: '', perfil: op.perfil, equipe: op.equipe ?? 'Alpha' })
    setModal(op)
  }

  function salvar() {
    if (!form.nome.trim() || !form.matricula.trim()) return
    const snap = modal
    if (snap === null) return
    startTransition(async () => {
      if (snap === 'add') {
        const res = await criarOperador({ gaepId, ...form })
        if (res.error) { showToast(`❌ ${res.error}`); return }
        setOps((prev) => [
          ...prev,
          { id: res.id!, nome: form.nome, matricula: form.matricula, perfil: form.perfil, equipe: form.equipe, ativo: true, email_funcional: null },
        ])
        showToast('✅ Operador cadastrado com sucesso!')
      } else {
        const res = await editarOperador(snap.id, { nome: form.nome, perfil: form.perfil, equipe: form.equipe || null })
        if (res.error) { showToast(`❌ ${res.error}`); return }
        setOps((prev) => prev.map((x) => x.id === snap.id ? { ...x, nome: form.nome, perfil: form.perfil, equipe: form.equipe || null } : x))
        showToast('✅ Operador atualizado!')
      }
      setModal(null)
    })
  }

  function handleToggleAtivo(op: OperadorRow) {
    startTransition(async () => {
      const res = await toggleAtivoOperador(op.id, !op.ativo)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setOps((prev) => prev.map((x) => x.id === op.id ? { ...x, ativo: !x.ativo } : x))
      showToast(`✅ ${op.ativo ? 'Operador desativado.' : 'Operador ativado.'}`)
    })
  }

  const filtered = ops.filter((o) => o.nome.toLowerCase().includes(search.toLowerCase()))
  const ativos = ops.filter((o) => o.ativo).length

  return (
    <div>
      <Toast msg={toast} />
      <AdminCard>
        <SectionHeader
          title={`Operadores (${ativos} ativos)`}
          action={<AddBtn onClick={openAdd} label="+ Novo Operador" disabled={pending} />}
        />
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            placeholder="🔍  Buscar operador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...mInput, background: '#f8fafc' }}
          />
        </div>
        {filtered.map((op) => (
          <div
            key={op.id}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: op.ativo ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(26,35,126,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: '#1a237e',
                flexShrink: 0,
              }}
            >
              {op.nome[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{op.nome}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Mat. {op.matricula} · Equipe {op.equipe ?? '—'}
              </div>
              <div style={{ marginTop: 3 }}>
                <Tag perfil={op.perfil} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <ActionBtn onClick={() => openEdit(op)} color="#2563eb" disabled={pending}>
                ✏️ Editar
              </ActionBtn>
              <ActionBtn onClick={() => handleToggleAtivo(op)} color={op.ativo ? '#ef4444' : '#16a34a'} disabled={pending}>
                {op.ativo ? '🔒 Desativar' : '✅ Ativar'}
              </ActionBtn>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhum operador encontrado
          </div>
        )}
      </AdminCard>

      {modal !== null && (
        <Modal
          title={modal === 'add' ? 'Novo Operador' : `Editar — ${(modal as OperadorRow).nome}`}
          onClose={() => setModal(null)}
        >
          <FormField label="Nome de Guerra">
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              style={mInput}
              placeholder="Nome do operador"
              autoFocus
            />
          </FormField>
          <FormField label="Matrícula">
            <input
              value={form.matricula}
              onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
              style={mInput}
              placeholder="Ex: 013"
              disabled={modal !== 'add'}
            />
          </FormField>
          {modal === 'add' && (
            <FormField label="Senha inicial (padrão: 1234)">
              <input
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                style={mInput}
                placeholder="Deixe vazio para usar '1234'"
              />
            </FormField>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Perfil de Acesso">
              <select
                value={form.perfil}
                onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                style={mInput}
              >
                {PERFIS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Equipe">
              <select
                value={form.equipe}
                onChange={(e) => setForm((f) => ({ ...f, equipe: e.target.value }))}
                style={mInput}
              >
                {EQUIPES.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </FormField>
          </div>
          <button
            onClick={salvar}
            disabled={pending || !form.nome.trim() || !form.matricula.trim()}
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
              marginTop: 8,
            }}
          >
            {pending ? '⏳ Salvando...' : modal === 'add' ? 'Cadastrar Operador' : 'Salvar Alterações'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Atividades ───────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  OPERAR: '#1a237e',
  TREINAR: '#f97316',
  INSTRUIR: '#16a34a',
}

function TabAtividades({
  initialAtividades,
  categorias,
}: {
  initialAtividades: AtividadeRow[]
  categorias: { id: string; nome: string }[]
}) {
  const [atividades, setAtividades] = useState<AtividadeRow[]>(initialAtividades)
  const [modal, setModal] = useState(false)
  const [novaAtiv, setNovaAtiv] = useState('')
  const [novaCatId, setNovaCatId] = useState(categorias[0]?.id ?? '')
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function adicionar() {
    if (!novaAtiv.trim() || !novaCatId) return
    startTransition(async () => {
      const res = await adicionarAtividade(novaCatId, novaAtiv)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      const cat = categorias.find((c) => c.id === novaCatId)
      setAtividades((prev) => [...prev, { id: res.id!, nome: novaAtiv.trim(), categoria_id: novaCatId }])
      showToast(`✅ "${novaAtiv.trim()}" adicionada em ${cat?.nome ?? ''}`)
      setNovaAtiv('')
      setModal(false)
    })
  }

  function remover(id: string, nome: string) {
    startTransition(async () => {
      const res = await removerAtividade(id)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setAtividades((prev) => prev.filter((a) => a.id !== id))
      showToast(`🗑️ "${nome}" removida`)
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      {categorias.map((cat) => {
        const lista = atividades.filter((a) => a.categoria_id === cat.id)
        const cor = CAT_COLORS[cat.nome] ?? '#64748b'
        return (
          <AdminCard key={cat.id}>
            <SectionHeader
              title={`${cat.nome} (${lista.length})`}
              action={
                <AddBtn
                  onClick={() => { setNovaCatId(cat.id); setModal(true) }}
                  label="+ Atividade"
                  disabled={pending}
                />
              }
            />
            {lista.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: '1px solid #f8fafc',
                  gap: 10,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{a.nome}</span>
                <ActionBtn onClick={() => remover(a.id, a.nome)} color="#ef4444" disabled={pending}>
                  🗑️
                </ActionBtn>
              </div>
            ))}
            {lista.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Nenhuma atividade cadastrada
              </div>
            )}
          </AdminCard>
        )
      })}

      {modal && (
        <Modal
          title={`Nova Atividade — ${categorias.find((c) => c.id === novaCatId)?.nome ?? ''}`}
          onClose={() => setModal(false)}
        >
          <FormField label="Categoria">
            <select value={novaCatId} onChange={(e) => setNovaCatId(e.target.value)} style={mInput}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Nome da Atividade">
            <input
              value={novaAtiv}
              onChange={(e) => setNovaAtiv(e.target.value)}
              style={mInput}
              placeholder="Ex: Operação Especial"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            />
          </FormField>
          <button
            onClick={adicionar}
            disabled={pending || !novaAtiv.trim()}
            style={{
              width: '100%',
              padding: 14,
              background: pending ? '#94a3b8' : '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {pending ? '⏳ Salvando...' : 'Adicionar Atividade'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Feriados ─────────────────────────────────────────────

function TabFeriados({ gaepId, initial }: { gaepId: string; initial: FeriadoRow[] }) {
  const [feriados, setFeriados] = useState<FeriadoRow[]>(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ data: '', descricao: '' })
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function adicionar() {
    if (!form.data || !form.descricao.trim()) return
    startTransition(async () => {
      const res = await adicionarFeriado(gaepId, form.data, form.descricao)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setFeriados((prev) =>
        [...prev, { id: res.id!, data: form.data, descricao: form.descricao.trim() }].sort((a, b) =>
          a.data.localeCompare(b.data)
        )
      )
      showToast('✅ Feriado cadastrado!')
      setForm({ data: '', descricao: '' })
      setModal(false)
    })
  }

  function remover(id: string) {
    startTransition(async () => {
      const res = await removerFeriado(id)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setFeriados((prev) => prev.filter((f) => f.id !== id))
      showToast('🗑️ Feriado removido')
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      <div
        style={{
          background: 'rgba(26,35,126,0.05)',
          borderLeft: '4px solid #1a237e',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 14,
          fontSize: '0.83rem',
          color: '#334155',
        }}
      >
        📌 Feriados afetam o cálculo da <strong>carga horária de expediente</strong> (7h × dias úteis do mês).
      </div>
      <AdminCard>
        <SectionHeader
          title={`Feriados ${new Date().getFullYear()} (${feriados.length})`}
          action={<AddBtn onClick={() => setModal(true)} label="+ Feriado" disabled={pending} />}
        />
        {feriados.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '11px 16px',
              borderBottom: '1px solid #f8fafc',
              gap: 10,
            }}
          >
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                padding: '5px 10px',
                textAlign: 'center',
                minWidth: 56,
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                {fmtData(f.data).substring(0, 5)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                {fmtData(f.data).substring(6)}
              </div>
            </div>
            <span style={{ flex: 1, fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>{f.descricao}</span>
            <ActionBtn onClick={() => remover(f.id)} color="#ef4444" disabled={pending}>
              🗑️
            </ActionBtn>
          </div>
        ))}
        {feriados.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhum feriado cadastrado
          </div>
        )}
      </AdminCard>

      {modal && (
        <Modal title="Novo Feriado" onClose={() => setModal(false)}>
          <FormField label="Data">
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              style={mInput}
            />
          </FormField>
          <FormField label="Descrição">
            <input
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              style={mInput}
              placeholder="Ex: Aniversário de Catanduvas"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            />
          </FormField>
          <button
            onClick={adicionar}
            disabled={pending || !form.data || !form.descricao.trim()}
            style={{
              width: '100%',
              padding: 14,
              background: pending ? '#94a3b8' : '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {pending ? '⏳ Salvando...' : 'Cadastrar Feriado'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Config IA ────────────────────────────────────────────

function TabIA({
  gaepId,
  operadorId,
  initial,
}: {
  gaepId: string
  operadorId: string
  initial: ConfigIAData
}) {
  const [cfg, setCfg] = useState<ConfigIAData>(initial)
  const [toast, setToast] = useState('')
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState('')
  const [pendingSave, startSave] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function salvar() {
    startSave(async () => {
      const res = await salvarConfigIA(gaepId, cfg.modelo, cfg.temperatura, cfg.prompt, operadorId)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      showToast('✅ Configuração salva!')
    })
  }

  async function testar() {
    if (!cfg.prompt.trim()) return
    setTestando(true)
    setResultado('')
    const res = await testarPromptIA(cfg.modelo, cfg.temperatura, cfg.prompt)
    setTestando(false)
    if (res.error) { showToast(`❌ ${res.error}`); return }
    setResultado(res.resultado ?? '')
  }

  return (
    <div>
      <Toast msg={toast} />
      <AdminCard>
        <SectionHeader title="Configuração do Modelo IA" />
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Modelo GPT</label>
            <select
              value={cfg.modelo}
              onChange={(e) => setCfg((c) => ({ ...c, modelo: e.target.value }))}
              style={mInput}
            >
              <option>gpt-4o</option>
              <option>gpt-4o-mini</option>
              <option>gpt-4-turbo</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>
              Temperatura:{' '}
              <span style={{ color: '#1a237e', fontWeight: 800 }}>{cfg.temperatura}</span>
              <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8, fontSize: '0.68rem' }}>
                (0.1 = preciso · 1.0 = criativo)
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={cfg.temperatura}
              onChange={(e) => setCfg((c) => ({ ...c, temperatura: parseFloat(e.target.value) }))}
              style={{ width: '100%', marginTop: 8, accentColor: '#1a237e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
              <span>0.1 — Formal</span>
              <span>0.5 — Balanceado</span>
              <span>1.0 — Criativo</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Prompt do Sistema</label>
            <textarea
              value={cfg.prompt}
              onChange={(e) => setCfg((c) => ({ ...c, prompt: e.target.value }))}
              rows={8}
              style={{ ...mInput, resize: 'vertical', fontFamily: 'Courier New, monospace', fontSize: '0.8rem', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <button
              onClick={testar}
              disabled={testando || !cfg.prompt.trim()}
              style={{
                padding: 12,
                background: testando ? '#93c5fd' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: testando ? 'not-allowed' : 'pointer',
              }}
            >
              {testando ? '⏳ Testando...' : '🧪 Testar Prompt'}
            </button>
            <button
              onClick={salvar}
              disabled={pendingSave}
              style={{
                padding: 12,
                background: pendingSave ? '#94a3b8' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: pendingSave ? 'not-allowed' : 'pointer',
              }}
            >
              {pendingSave ? '⏳ Salvando...' : '💾 Salvar Config'}
            </button>
          </div>

          {resultado && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'rgba(37,99,235,0.05)',
                border: '1px solid rgba(37,99,235,0.2)',
                borderRadius: 10,
              }}
            >
              <div style={lStyle}>Resultado do Teste:</div>
              <p style={{ fontSize: '0.87rem', color: '#1e293b', lineHeight: 1.7, marginTop: 6 }}>{resultado}</p>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  )
}

// ── Tab: Diárias ──────────────────────────────────────────────

function TabDiarias({ initial }: { initial: DiariaRow[] }) {
  const [diarias, setDiarias] = useState<DiariaRow[]>(initial)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<{ locais: string; valor: number }>({ locais: '', valor: 0 })
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function iniciarEdicao(d: DiariaRow) {
    setEditando(d.id)
    setForm({ locais: d.locais, valor: d.valor })
  }

  function salvar(id: string) {
    startTransition(async () => {
      const res = await editarDiaria(id, form.locais, form.valor)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      const hoje = new Date().toISOString().split('T')[0]
      setDiarias((prev) => prev.map((d) => d.id === id ? { ...d, locais: form.locais, valor: form.valor, vigencia: hoje } : d))
      setEditando(null)
      showToast('✅ Valor atualizado! Nova vigência registrada.')
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      <div
        style={{
          background: 'rgba(249,115,22,0.07)',
          borderLeft: '4px solid #f97316',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 14,
          fontSize: '0.83rem',
          color: '#7c2d12',
        }}
      >
        ⚠️ Alterações de valor <strong>não retroagem</strong> em missões já registradas. O valor antigo fica como snapshot.
      </div>

      {diarias.map((d) => (
        <AdminCard key={d.id}>
          <div style={{ padding: 16 }}>
            {editando === d.id ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1a237e', marginBottom: 14 }}>{d.tipo}</div>
                <FormField label="Destinos / Locais">
                  <input
                    value={form.locais}
                    onChange={(e) => setForm((f) => ({ ...f, locais: e.target.value }))}
                    style={mInput}
                  />
                </FormField>
                <FormField label="Valor (R$)">
                  <input
                    type="number"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: parseFloat(e.target.value) }))}
                    style={mInput}
                    step="5"
                    min="0"
                  />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => salvar(d.id)}
                    disabled={pending}
                    style={{ padding: 12, background: pending ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer' }}
                  >
                    {pending ? '⏳...' : '✅ Salvar'}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    style={{ padding: 12, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a237e' }}>{d.tipo}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{d.locais}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                    Vigência desde: {fmtData(d.vigencia)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a' }}>{fmtMoeda(d.valor)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>por diária</div>
                  <ActionBtn onClick={() => iniciarEdicao(d)} color="#2563eb" disabled={pending}>
                    ✏️ Editar
                  </ActionBtn>
                </div>
              </div>
            )}
          </div>
        </AdminCard>
      ))}
    </div>
  )
}

// ── Tab: GAEPs (SUPER_ADMIN) ──────────────────────────────────

function TabGAEPs({ initial }: { initial: GaepRow[] }) {
  const [gaeps, setGaeps] = useState<GaepRow[]>(initial)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ codigo: '', cidade: '', estado: '' })
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function adicionar() {
    if (!form.codigo.trim() || !form.cidade.trim() || !form.estado.trim()) return
    startTransition(async () => {
      const res = await adicionarGaep(form)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setGaeps((prev) => [...prev, { id: res.id!, ...form, estado: form.estado.toUpperCase(), ativo: false }])
      showToast('✅ Unidade GAEP cadastrada!')
      setModal(false)
      setForm({ codigo: '', cidade: '', estado: '' })
    })
  }

  function handleToggle(g: GaepRow) {
    startTransition(async () => {
      const res = await toggleAtivoGaep(g.id, !g.ativo)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setGaeps((prev) => prev.map((x) => x.id === g.id ? { ...x, ativo: !x.ativo } : x))
      showToast(`✅ ${g.codigo} ${g.ativo ? 'desativado' : 'ativado'}.`)
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      <div
        style={{
          background: 'rgba(124,58,237,0.06)',
          borderLeft: '4px solid #7c3aed',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 14,
          fontSize: '0.83rem',
          color: '#4c1d95',
        }}
      >
        🌐 Painel exclusivo <strong>SUPER ADMIN</strong>. Gerencie todas as unidades GAEP no país.
      </div>

      <AdminCard>
        <SectionHeader
          title={`Unidades GAEP (${gaeps.length})`}
          action={<AddBtn onClick={() => setModal(true)} label="+ Nova Unidade" disabled={pending} />}
        />
        {gaeps.map((g) => (
          <div
            key={g.id}
            style={{ padding: '13px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: g.ativo ? 'rgba(26,35,126,0.08)' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🏛️</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: g.ativo ? '#1a237e' : '#94a3b8' }}>
                  {g.codigo}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 7px',
                    borderRadius: 20,
                    fontWeight: 700,
                    background: g.ativo ? 'rgba(22,163,74,0.1)' : 'rgba(148,163,184,0.15)',
                    color: g.ativo ? '#16a34a' : '#94a3b8',
                    border: `1px solid ${g.ativo ? 'rgba(22,163,74,0.3)' : '#e2e8f0'}`,
                  }}
                >
                  {g.ativo ? 'ATIVA' : 'INATIVA'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {g.cidade}/{g.estado}
              </div>
            </div>
            <ActionBtn onClick={() => handleToggle(g)} color={g.ativo ? '#ef4444' : '#16a34a'} disabled={pending}>
              {g.ativo ? '🔒 Desativar' : '✅ Ativar'}
            </ActionBtn>
          </div>
        ))}
        {gaeps.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhuma unidade cadastrada
          </div>
        )}
      </AdminCard>

      {modal && (
        <Modal title="Nova Unidade GAEP" onClose={() => setModal(false)}>
          <FormField label="Código da Unidade">
            <input
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              style={mInput}
              placeholder="Ex: GAEP-XXX"
              autoFocus
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Cidade">
              <input
                value={form.cidade}
                onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                style={mInput}
                placeholder="Cidade"
              />
            </FormField>
            <FormField label="Estado">
              <input
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                style={mInput}
                placeholder="UF"
                maxLength={2}
              />
            </FormField>
          </div>
          <button
            onClick={adicionar}
            disabled={pending || !form.codigo.trim() || !form.cidade.trim() || !form.estado.trim()}
            style={{
              width: '100%',
              padding: 14,
              background: pending ? '#94a3b8' : '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              marginTop: 8,
            }}
          >
            {pending ? '⏳ Cadastrando...' : 'Cadastrar Unidade'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Importação ───────────────────────────────────────────

function TabImportacaoRelatorios() {
  const [toast, setToast] = useState('')
  const [resultado, setResultado] = useState('')
  const [errorLines, setErrorLines] = useState<Array<{ line: number; reason: string }>>([])
  const [pending, startTransition] = useTransition()
  const [pendingMissoes, startTransitionMissoes] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function handleUpload(file: File | null) {
    if (!file) return
    startTransition(async () => {
      const content = await file.text()
      const res = await importarRelatoriosCsv(content)
      if (res.error) {
        showToast(`❌ ${res.error}`)
        return
      }
      setErrorLines(res.errors ?? [])
      const msg = `✅ Importação concluída. Inseridos: ${res.inserted ?? 0}, atualizados: ${res.updated ?? 0}, ignorados: ${res.skipped ?? 0}.`
      setResultado(msg)
      showToast(msg)
    })
  }

  function handleUploadMissoes(file: File | null) {
    if (!file) return
    startTransitionMissoes(async () => {
      await file.text()
      showToast('⚠️ Upload de CSV de missões recebido. A rotina de importação será conectada no próximo passo.')
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      <AdminCard>
        <SectionHeader title="Importação de Relatórios (CSV)" />
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, marginTop: 0 }}>
            Baixe o modelo, preencha com os dados do sistema anterior e envie o CSV para atualizar a base de relatórios.
            O separador esperado é <strong>ponto e vírgula (;)</strong>.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <a
              href="/modelos/importacao-relatorios-template.csv"
              download
              style={{
                display: 'inline-block',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#1a237e',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              ⬇️ Baixar modelo CSV
            </a>
            <label
              style={{
                display: 'inline-block',
                padding: '10px 12px',
                borderRadius: 8,
                background: pending ? '#94a3b8' : '#16a34a',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              {pending ? '⏳ Importando...' : '📤 Enviar CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={pending}
                style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.7 }}>
            Campos obrigatórios no modelo: <code>gaep_codigo</code>, <code>relator_matricula</code>, <code>data</code>, <code>hora_inicio</code>, <code>hora_fim</code>, <code>categoria_nome</code>, <code>atividade_nome</code>, <code>descricao_revisada</code>.
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 800, marginBottom: 8 }}>
              Importação de Missões (CSV)
            </div>
            <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginTop: 0, marginBottom: 10 }}>
              Baixe o modelo de missões para migração do sistema anterior. O separador esperado também é <strong>ponto e vírgula (;)</strong>.
            </p>
            <a
              href="/modelos/importacao-missoes-template.csv"
              download
              style={{
                display: 'inline-block',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#1a237e',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                marginBottom: 8,
              }}
            >
              ⬇️ Baixar modelo CSV de Missões
            </a>
            <label
              style={{
                display: 'inline-block',
                marginLeft: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: pendingMissoes ? '#94a3b8' : '#16a34a',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: pendingMissoes ? 'not-allowed' : 'pointer',
                marginBottom: 8,
              }}
            >
              {pendingMissoes ? '⏳ Enviando...' : '📤 Enviar CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={pendingMissoes}
                style={{ display: 'none' }}
                onChange={(e) => handleUploadMissoes(e.target.files?.[0] ?? null)}
              />
            </label>
            <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.7 }}>
              Campos obrigatórios no modelo: <code>gaep_codigo</code>, <code>operador_matricula</code>, <code>tipo_missao</code>, <code>qtd</code>, <code>valor_unitario</code>.
            </div>
          </div>
          {resultado && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.25)',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              {resultado}
            </div>
          )}
          {errorLines.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <div style={{ color: '#991b1b', fontWeight: 800, fontSize: '0.8rem', marginBottom: 6 }}>
                Linhas com erro ({errorLines.length})
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {errorLines.map((err, idx) => (
                  <div key={`${err.line}-${idx}`} style={{ fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                    Linha {err.line}: {err.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

interface Tab {
  id: string
  label: string
  comp: React.ReactNode
}

export function GestaoClient({ data }: { data: GestaoData }) {
  const isSuperAdmin = data.operadorAtual.perfil === 'SUPER_ADMIN'
  const searchParams = useSearchParams()

  const tabs: Tab[] = [
    {
      id: 'efetivo',
      label: 'Efetivo',
      comp: <TabEfetivo gaepId={data.gaep.id} initial={data.operadores} />,
    },
    {
      id: 'atividades',
      label: 'Atividades',
      comp: <TabAtividades initialAtividades={data.atividades} categorias={data.categorias} />,
    },
    {
      id: 'feriados',
      label: 'Feriados',
      comp: <TabFeriados gaepId={data.gaep.id} initial={data.feriados} />,
    },
    {
      id: 'ia',
      label: 'Config IA',
      comp: <TabIA gaepId={data.gaep.id} operadorId={data.operadorAtual.id} initial={data.configIA} />,
    },
    {
      id: 'diarias',
      label: 'Diárias',
      comp: <TabDiarias initial={data.diarias} />,
    },
    {
      id: 'importacao',
      label: 'Importar',
      comp: <TabImportacaoRelatorios />,
    },
    ...(isSuperAdmin
      ? [{ id: 'gaeps', label: 'GAEPs', comp: <TabGAEPs initial={data.gaeps} /> }]
      : []),
  ]

  const tabParam = searchParams.get('tab') ?? 'efetivo'
  const current = useMemo(() => tabs.find((t) => t.id === tabParam) ?? tabs[0], [tabParam, tabs])

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Badge de nível */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: isSuperAdmin ? 'rgba(124,58,237,0.06)' : 'rgba(26,35,126,0.05)',
          borderLeft: `4px solid ${isSuperAdmin ? '#7c3aed' : '#1a237e'}`,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Nível de Acesso
          </div>
          <div style={{ fontWeight: 800, color: isSuperAdmin ? '#7c3aed' : '#1a237e', fontSize: '1rem' }}>
            {isSuperAdmin ? '🔑 SUPER ADMIN — Acesso Total' : `⚙️ ADMIN — ${data.gaep.codigo}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {data.operadorAtual.nome} ·{' '}
            {isSuperAdmin ? 'Todos os GAEPs' : `${data.gaep.codigo} · ${data.gaep.cidade}/${data.gaep.estado}`}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div key={current?.id}>{current?.comp}</div>
    </div>
  )
}
