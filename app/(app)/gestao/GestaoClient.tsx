'use client'

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  criarOperador,
  editarOperador,
  toggleAtivoOperador,
  adicionarAtividade,
  editarAtividade,
  removerAtividade,
  adicionarFeriado,
  removerFeriado,
  salvarConfigIA,
  salvarConfigRelatorio,
  salvarTimbradoBase64,
  removerTimbrado,
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
  nome_completo: string | null
  matricula: string
  perfil: string
  equipe: string | null
  ativo: boolean
  email_funcional: string | null
  numerica: string | null
  tipo_sanguineo: string | null
  alergia: string | null
  contato_emergencia: string | null
  nome_contato_emergencia: string | null
  plano_saude: string | null
  numero_carteirinha: string | null
  cpf: string | null
  email: string | null
}

export interface AtividadeRow {
  id: string
  nome: string
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

export type AlinhamentoRelatorio = 'left' | 'center' | 'right' | 'justify'

export interface EstiloBlocoRelatorio {
  fontFamily: string
  fontColor: string
  align: AlinhamentoRelatorio
  indent: number
  lineHeight: number
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  marginTop?: number
  marginBottom?: number
}

export interface ConfigRelatorioUIData {
  id: string | null
  tituloTexto: string
  subtituloTexto: string
  descricaoTexto: string
  rodapeTexto: string
  tituloEstilo: EstiloBlocoRelatorio
  subtituloEstilo: EstiloBlocoRelatorio
  descricaoEstilo: EstiloBlocoRelatorio
  rodapeEstilo: EstiloBlocoRelatorio
  timbradoUrl: string | null
  printMargins: {
    top: number
    right: number
    bottom: number
    left: number
  }
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
  configRelatorio: ConfigRelatorioUIData
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

function sortAtividades(list: AtividadeRow[]) {
  return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
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
  const [form, setForm] = useState({
    nome: '',
    nomeCompleto: '',
    matricula: '',
    senha: '',
    perfil: 'OPERADOR',
    equipe: 'Alpha',
    numerica: '',
    tipoSanguineo: '',
    alergia: '',
    contatoEmergencia: '',
    nomeContatoEmergencia: '',
    planoSaude: '',
    numeroCarteirinha: '',
    cpf: '',
    email: '',
  })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openAdd() {
    setForm({
      nome: '',
      nomeCompleto: '',
      matricula: '',
      senha: '',
      perfil: 'OPERADOR',
      equipe: 'Alpha',
      numerica: '',
      tipoSanguineo: '',
      alergia: '',
      contatoEmergencia: '',
      nomeContatoEmergencia: '',
      planoSaude: '',
      numeroCarteirinha: '',
      cpf: '',
      email: '',
    })
    setModal('add')
  }

  function openEdit(op: OperadorRow) {
    setForm({
      nome: op.nome,
      nomeCompleto: op.nome_completo ?? '',
      matricula: op.matricula,
      senha: '',
      perfil: op.perfil,
      equipe: op.equipe ?? 'Alpha',
      numerica: op.numerica ?? '',
      tipoSanguineo: op.tipo_sanguineo ?? '',
      alergia: op.alergia ?? '',
      contatoEmergencia: op.contato_emergencia ?? '',
      nomeContatoEmergencia: op.nome_contato_emergencia ?? '',
      planoSaude: op.plano_saude ?? '',
      numeroCarteirinha: op.numero_carteirinha ?? '',
      cpf: op.cpf ?? '',
      email: op.email ?? '',
    })
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
          {
            id: res.id!,
            nome: form.nome,
            nome_completo: form.nomeCompleto || null,
            matricula: form.matricula,
            perfil: form.perfil,
            equipe: form.equipe,
            ativo: true,
            email_funcional: null,
            numerica: form.numerica || null,
            tipo_sanguineo: form.tipoSanguineo || null,
            alergia: form.alergia || null,
            contato_emergencia: form.contatoEmergencia || null,
            nome_contato_emergencia: form.nomeContatoEmergencia || null,
            plano_saude: form.planoSaude || null,
            numero_carteirinha: form.numeroCarteirinha || null,
            cpf: form.cpf || null,
            email: form.email || null,
          },
        ])
        showToast('✅ Operador cadastrado com sucesso!')
        setModal(null)
      } else {
        const res = await editarOperador(snap.id, {
          nome: form.nome,
          nomeCompleto: form.nomeCompleto,
          matricula: form.matricula,
          perfil: form.perfil,
          equipe: form.equipe || null,
          numerica: form.numerica,
          tipoSanguineo: form.tipoSanguineo,
          alergia: form.alergia,
          contatoEmergencia: form.contatoEmergencia,
          nomeContatoEmergencia: form.nomeContatoEmergencia,
          planoSaude: form.planoSaude,
          numeroCarteirinha: form.numeroCarteirinha,
          cpf: form.cpf,
          email: form.email,
        })
        if (res.error) { showToast(`❌ ${res.error}`); return }
        setOps((prev) =>
          prev.map((x) =>
            x.id === snap.id
              ? {
                  ...x,
                  nome: form.nome,
                  nome_completo: form.nomeCompleto || null,
                  perfil: form.perfil,
                  equipe: form.equipe || null,
                  numerica: form.numerica || null,
                  tipo_sanguineo: form.tipoSanguineo || null,
                  alergia: form.alergia || null,
                  contato_emergencia: form.contatoEmergencia || null,
                  nome_contato_emergencia: form.nomeContatoEmergencia || null,
                  plano_saude: form.planoSaude || null,
                  numero_carteirinha: form.numeroCarteirinha || null,
                  cpf: form.cpf || null,
                  email: form.email || null,
                }
              : x
          )
        )
        showToast('✅ Operador atualizado!')
        setModal(null)
      }
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
              {op.numerica?.trim() || ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                {op.nome_completo?.trim() || op.nome}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Mat. {op.matricula} · Num. {op.numerica?.trim() || '—'}
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
          <FormField label="Nome Completo">
            <input
              value={form.nomeCompleto}
              onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))}
              style={mInput}
              placeholder="Nome completo do operador"
            />
          </FormField>
          <FormField label="Matrícula">
            <input
              value={form.matricula}
              onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
              style={mInput}
              placeholder="Ex: 013"
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
          <FormField label="Numérica">
            <input
              value={form.numerica}
              onChange={(e) => setForm((f) => ({ ...f, numerica: e.target.value }))}
              style={mInput}
              placeholder="Ex: 12"
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tipo Sanguíneo">
              <input
                value={form.tipoSanguineo}
                onChange={(e) => setForm((f) => ({ ...f, tipoSanguineo: e.target.value }))}
                style={mInput}
                placeholder="Ex: O+"
              />
            </FormField>
            <FormField label="Alergia">
              <input
                value={form.alergia}
                onChange={(e) => setForm((f) => ({ ...f, alergia: e.target.value }))}
                style={mInput}
                placeholder="Ex: Dipirona"
              />
            </FormField>
          </div>
          <FormField label="Contato de Emergência">
            <input
              value={form.contatoEmergencia}
              onChange={(e) => setForm((f) => ({ ...f, contatoEmergencia: e.target.value }))}
              style={mInput}
              placeholder="Ex: (44) 99999-9999"
            />
          </FormField>
          <FormField label="Nome do Contato">
            <input
              value={form.nomeContatoEmergencia}
              onChange={(e) => setForm((f) => ({ ...f, nomeContatoEmergencia: e.target.value }))}
              style={mInput}
              placeholder="Nome completo"
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Plano de Saúde">
              <input
                value={form.planoSaude}
                onChange={(e) => setForm((f) => ({ ...f, planoSaude: e.target.value }))}
                style={mInput}
                placeholder="Ex: Unimed"
              />
            </FormField>
            <FormField label="Nº da Carteirinha">
              <input
                value={form.numeroCarteirinha}
                onChange={(e) => setForm((f) => ({ ...f, numeroCarteirinha: e.target.value }))}
                style={mInput}
              />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="CPF">
              <input
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                style={mInput}
                placeholder="Somente números"
              />
            </FormField>
            <FormField label="E-mail">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={mInput}
                placeholder="nome@dominio.com"
              />
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

function TabAtividades({
  initialAtividades,
}: {
  initialAtividades: AtividadeRow[]
  categorias: { id: string; nome: string }[]
}) {
  const [atividades, setAtividades] = useState<AtividadeRow[]>(() => sortAtividades(initialAtividades))
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState<AtividadeRow | null>(null)
  const [novaAtiv, setNovaAtiv] = useState('')
  const [nomeEdit, setNomeEdit] = useState('')
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function adicionar() {
    const nomeLimpo = novaAtiv.trim()
    if (!nomeLimpo) return
    const existeDuplicada = atividades.some((a) => a.nome.trim().toLocaleLowerCase('pt-BR') === nomeLimpo.toLocaleLowerCase('pt-BR'))
    if (existeDuplicada) {
      showToast('❌ Já existe uma atividade com esse nome.')
      return
    }
    startTransition(async () => {
      const res = await adicionarAtividade(nomeLimpo)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setAtividades((prev) => sortAtividades([...prev, { id: res.id!, nome: nomeLimpo }]))
      showToast(`✅ "${nomeLimpo}" adicionada`)
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

  function abrirEdicao(atividade: AtividadeRow) {
    setEditModal(atividade)
    setNomeEdit(atividade.nome)
  }

  function salvarEdicao() {
    const nomeLimpo = nomeEdit.trim()
    if (!editModal || !nomeLimpo) return
    const existeDuplicada = atividades.some(
      (a) =>
        a.id !== editModal.id &&
        a.nome.trim().toLocaleLowerCase('pt-BR') === nomeLimpo.toLocaleLowerCase('pt-BR')
    )
    if (existeDuplicada) {
      showToast('❌ Já existe uma atividade com esse nome.')
      return
    }
    startTransition(async () => {
      const res = await editarAtividade(editModal.id, nomeLimpo)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setAtividades((prev) =>
        sortAtividades(prev.map((a) => (a.id === editModal.id ? { ...a, nome: nomeLimpo } : a)))
      )
      setEditModal(null)
      setNomeEdit('')
      showToast('✅ Atividade atualizada')
    })
  }

  return (
    <div>
      <Toast msg={toast} />
      <AdminCard>
        <SectionHeader
          title={`Atividades (${atividades.length})`}
          action={
            <AddBtn
              onClick={() => setModal(true)}
              label="+ Atividade"
              disabled={pending}
            />
          }
        />
        {atividades.map((a) => (
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
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a237e', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{a.nome}</span>
            <ActionBtn onClick={() => abrirEdicao(a)} color="#2563eb" disabled={pending}>
              ✏️
            </ActionBtn>
            <ActionBtn onClick={() => remover(a.id, a.nome)} color="#ef4444" disabled={pending}>
              🗑️
            </ActionBtn>
          </div>
        ))}
        {atividades.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhuma atividade cadastrada
          </div>
        )}
      </AdminCard>

      {modal && (
        <Modal
          title="Nova Atividade"
          onClose={() => setModal(false)}
        >
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

      {editModal && (
        <Modal
          title={`Editar Atividade — ${editModal.nome}`}
          onClose={() => {
            setEditModal(null)
            setNomeEdit('')
          }}
        >
          <FormField label="Nome da Atividade">
            <input
              value={nomeEdit}
              onChange={(e) => setNomeEdit(e.target.value)}
              style={mInput}
              placeholder="Ex: Operação Especial"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && salvarEdicao()}
            />
          </FormField>
          <button
            onClick={salvarEdicao}
            disabled={pending || !nomeEdit.trim()}
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
            {pending ? '⏳ Salvando...' : 'Salvar alterações'}
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

const FONT_OPTIONS = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Courier New'] as const
const ALIGN_OPTIONS: Array<{ value: AlinhamentoRelatorio; label: string }> = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centralizado' },
  { value: 'right', label: 'Direita' },
  { value: 'justify', label: 'Justificado' },
]

function StyleEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value: EstiloBlocoRelatorio
  onChange: (next: EstiloBlocoRelatorio) => void
}) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, background: '#f8fafc' }}>
      <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 800, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Fonte">
          <select
            value={value.fontFamily}
            onChange={(e) => onChange({ ...value, fontFamily: e.target.value })}
            style={mInput}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Cor da Fonte">
          <input
            type="color"
            value={value.fontColor}
            onChange={(e) => onChange({ ...value, fontColor: e.target.value })}
            style={{ ...mInput, height: 40, padding: 4 }}
          />
        </FormField>
        <FormField label="Alinhamento">
          <select
            value={value.align}
            onChange={(e) => onChange({ ...value, align: e.target.value as AlinhamentoRelatorio })}
            style={mInput}
          >
            {ALIGN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tamanho (pt)">
          <input
            type="number"
            value={value.fontSize ?? 11}
            min={7}
            max={36}
            onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value || 11) })}
            style={mInput}
          />
        </FormField>
        <FormField label="Recuo (px) ← →">
          <input
            type="number"
            value={value.indent}
            min={-300}
            max={300}
            onChange={(e) => onChange({ ...value, indent: Number(e.target.value) })}
            style={mInput}
          />
        </FormField>
        <FormField label="Espaç. linhas">
          <input
            type="number"
            value={value.lineHeight}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => onChange({ ...value, lineHeight: Number(e.target.value || 1) })}
            style={mInput}
          />
        </FormField>
      </div>

      {/* Negrito / Itálico / Sublinhado */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, marginBottom: 10 }}>
        {(
          [
            { key: 'bold', label: 'N', extra: { fontWeight: 'bold' as const } },
            { key: 'italic', label: 'I', extra: { fontStyle: 'italic' as const } },
            { key: 'underline', label: 'S', extra: { textDecoration: 'underline' as const } },
          ] as const
        ).map(({ key, label, extra }) => {
          const active = !!value[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...value, [key]: !value[key] })}
              style={{
                width: 38,
                height: 38,
                border: `1.5px solid ${active ? '#1a237e' : '#e2e8f0'}`,
                borderRadius: 8,
                background: active ? '#1a237e' : '#fff',
                color: active ? '#fff' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.9rem',
                ...extra,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Margens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FormField label="Marg. Superior (mm)">
          <input
            type="number"
            value={value.marginTop ?? 0}
            min={0}
            max={80}
            onChange={(e) => onChange({ ...value, marginTop: Number(e.target.value || 0) })}
            style={mInput}
          />
        </FormField>
        <FormField label="Marg. Inferior (mm)">
          <input
            type="number"
            value={value.marginBottom ?? 0}
            min={0}
            max={80}
            onChange={(e) => onChange({ ...value, marginBottom: Number(e.target.value || 0) })}
            style={mInput}
          />
        </FormField>
      </div>
    </div>
  )
}

// Comprime a imagem para A4 @ 96dpi JPEG antes de salvar no banco como base64
async function compressToA4Jpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_W = 794
      const MAX_H = 1123
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_W || h > MAX_H) {
        const ratio = Math.min(MAX_W / w, MAX_H / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não disponível')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(objUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objUrl)
      reject(new Error('Erro ao ler imagem'))
    }
    img.src = objUrl
  })
}

// Preview usa CSS transform para WYSIWYG real — fontes em pt real, escalonado para caber na tela
const PREVIEW_W = 340   // largura visível do preview
const A4_W = 794        // A4 a 96dpi
const A4_H = 1123
const PREVIEW_H = Math.round(A4_H * (PREVIEW_W / A4_W))  // ~478px
const PREVIEW_SC = PREVIEW_W / A4_W                       // ~0.428

function PreviewRelatorio({ cfg, gaepCodigo }: { cfg: ConfigRelatorioUIData; gaepCodigo: string }) {
  const tStyle: React.CSSProperties = {
    fontFamily: cfg.tituloEstilo.fontFamily,
    color: cfg.tituloEstilo.fontColor,
    textAlign: cfg.tituloEstilo.align,
    marginLeft: `${cfg.tituloEstilo.indent}px`,
    lineHeight: cfg.tituloEstilo.lineHeight,
    fontSize: `${cfg.tituloEstilo.fontSize ?? 12}pt`,
    fontWeight: cfg.tituloEstilo.bold === false ? 'normal' : 'bold',
    fontStyle: cfg.tituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.tituloEstilo.underline ? 'underline' : 'none',
    marginTop: cfg.tituloEstilo.marginTop ? `${cfg.tituloEstilo.marginTop}mm` : undefined,
    marginBottom: cfg.tituloEstilo.marginBottom !== undefined ? `${cfg.tituloEstilo.marginBottom}mm` : '2mm',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    whiteSpace: 'pre-line',
  }
  const stStyle: React.CSSProperties = {
    fontFamily: cfg.subtituloEstilo.fontFamily,
    color: cfg.subtituloEstilo.fontColor,
    textAlign: cfg.subtituloEstilo.align,
    marginLeft: `${cfg.subtituloEstilo.indent}px`,
    lineHeight: cfg.subtituloEstilo.lineHeight,
    fontSize: `${cfg.subtituloEstilo.fontSize ?? 11}pt`,
    fontWeight: cfg.subtituloEstilo.bold ? 'bold' : 'normal',
    fontStyle: cfg.subtituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.subtituloEstilo.underline ? 'underline' : 'none',
    marginTop: cfg.subtituloEstilo.marginTop ? `${cfg.subtituloEstilo.marginTop}mm` : undefined,
    marginBottom: cfg.subtituloEstilo.marginBottom !== undefined ? `${cfg.subtituloEstilo.marginBottom}mm` : '3mm',
    borderBottom: '1.5px solid #333',
    paddingBottom: '2mm',
  }
  const dStyle: React.CSSProperties = {
    fontFamily: cfg.descricaoEstilo.fontFamily,
    color: cfg.descricaoEstilo.fontColor,
    textAlign: cfg.descricaoEstilo.align,
    marginLeft: `${cfg.descricaoEstilo.indent}px`,
    lineHeight: cfg.descricaoEstilo.lineHeight,
    fontSize: `${cfg.descricaoEstilo.fontSize ?? 11}pt`,
    fontWeight: cfg.descricaoEstilo.bold ? 'bold' : 'normal',
    fontStyle: cfg.descricaoEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.descricaoEstilo.underline ? 'underline' : 'none',
    marginTop: cfg.descricaoEstilo.marginTop ? `${cfg.descricaoEstilo.marginTop}mm` : undefined,
    marginBottom: cfg.descricaoEstilo.marginBottom !== undefined ? `${cfg.descricaoEstilo.marginBottom}mm` : undefined,
  }
  const rStyle: React.CSSProperties = {
    fontFamily: cfg.rodapeEstilo.fontFamily,
    color: cfg.rodapeEstilo.fontColor,
    textAlign: cfg.rodapeEstilo.align,
    marginLeft: `${cfg.rodapeEstilo.indent}px`,
    lineHeight: cfg.rodapeEstilo.lineHeight,
    fontSize: `${cfg.rodapeEstilo.fontSize ?? 8}pt`,
    fontWeight: cfg.rodapeEstilo.bold ? 'bold' : 'normal',
    fontStyle: cfg.rodapeEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.rodapeEstilo.underline ? 'underline' : 'none',
    marginTop: cfg.rodapeEstilo.marginTop ? `${cfg.rodapeEstilo.marginTop}mm` : undefined,
    borderTop: '1px solid #ccc',
    paddingTop: '2mm',
  }

  return (
    <div style={{ background: '#64748b', padding: 8, borderRadius: 8, marginTop: 14 }}>
      <div style={{ fontSize: '0.68rem', color: '#e2e8f0', fontWeight: 700, textAlign: 'center', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Preview A4 — WYSIWYG
      </div>
      {/* Janela de visibilidade do preview */}
      <div style={{ width: PREVIEW_W, maxWidth: '100%', height: PREVIEW_H, overflow: 'hidden', margin: '0 auto', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        {/* Página A4 real, escalonada via CSS transform */}
        <div
          style={{
            width: A4_W,
            height: A4_H,
            transformOrigin: 'top left',
            transform: `scale(${PREVIEW_SC})`,
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: '#fff',
            backgroundImage: cfg.timbradoUrl ? `url(${cfg.timbradoUrl})` : 'none',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Área de conteúdo espelhando print-page-content com as margens configuradas */}
          <div
            style={{
              position: 'absolute',
              top: cfg.printMargins.top * (A4_H / 297),
              left: cfg.printMargins.left * (A4_W / 210),
              right: cfg.printMargins.right * (A4_W / 210),
              bottom: cfg.printMargins.bottom * (A4_H / 297),
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={tStyle}>{cfg.tituloTexto || 'RELATÓRIO OPERACIONAL'}</div>
            <div style={stStyle}>{cfg.subtituloTexto || 'RELATÓRIO DE ATIVIDADE(S)'}</div>
            <div style={{ fontSize: '9pt', color: '#333', marginBottom: '4mm' }}>
              Data: 29/04/2026 | 08:00 às 16:00 | Categoria: OPERAR | Atividade: Escolta
            </div>
            <div style={{ ...dStyle, flex: 1, overflow: 'hidden' }}>
              {cfg.descricaoTexto || 'O texto do relatório operacional será exibido aqui com a formatação configurada pelo administrador do sistema.'}
            </div>
            <div style={rStyle}>
              {cfg.rodapeTexto.replace('{{GAEP}}', gaepCodigo).replace('{{VERSAO}}', '1')} · Emitido em 29/04/2026
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type SubTabRelatorio = 'timbrado' | 'titulo' | 'subtitulo' | 'descricao' | 'rodape' | 'margens'

const SUB_TAB_LABELS: Record<SubTabRelatorio, string> = {
  timbrado: '🖼 Timbrado',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  descricao: 'Descrição',
  rodape: 'Rodapé',
  margens: '📐 Margens',
}

function TabRelatorio({
  gaepId,
  operadorId,
  gaepCodigo,
  initial,
}: {
  gaepId: string
  operadorId: string
  gaepCodigo: string
  initial: ConfigRelatorioUIData
}) {
  const [cfg, setCfg] = useState<ConfigRelatorioUIData>(initial)
  const [subTab, setSubTab] = useState<SubTabRelatorio>('titulo')
  const [showPreview, setShowPreview] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function salvar() {
    startTransition(async () => {
      try {
        const res = await salvarConfigRelatorio(gaepId, operadorId, cfg)
        if (res.error) { showToast(`❌ ${res.error}`); return }
        showToast('✅ Configuração do relatório salva!')
      } catch (e) {
        showToast(`❌ Erro ao salvar: ${(e as Error).message}`)
      }
    })
  }

  async function handleTimbradoUpload(file: File) {
    setUploadando(true)
    try {
      const dataUrl = await compressToA4Jpeg(file)
      const res = await salvarTimbradoBase64(gaepId, dataUrl)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setCfg((prev) => ({ ...prev, timbradoUrl: dataUrl }))
      showToast('✅ Timbrado enviado com sucesso!')
    } catch (e) {
      showToast(`❌ Erro no upload: ${(e as Error).message}`)
    } finally {
      setUploadando(false)
    }
  }

  async function handleRemoverTimbrado() {
    setUploadando(true)
    try {
      const res = await removerTimbrado()
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setCfg((prev) => ({ ...prev, timbradoUrl: null }))
      showToast('🗑️ Timbrado removido.')
    } catch (e) {
      showToast(`❌ Erro ao remover: ${(e as Error).message}`)
    } finally {
      setUploadando(false)
    }
  }

  return (
    <div>
      <Toast msg={toast} />
      <AdminCard>
        <SectionHeader title="Papel Timbrado e Formatação do PDF" />
        <div style={{ padding: 16 }}>

          {/* Navegação de sub-abas */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
            {(Object.keys(SUB_TAB_LABELS) as SubTabRelatorio[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                style={{
                  padding: '6px 12px',
                  background: subTab === tab ? '#1a237e' : 'transparent',
                  color: subTab === tab ? '#fff' : '#64748b',
                  border: `1px solid ${subTab === tab ? '#1a237e' : '#e2e8f0'}`,
                  borderRadius: 20,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {SUB_TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Sub-aba: Timbrado */}
          {subTab === 'timbrado' && (
            <div>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 12 }}>
                Faça upload de uma imagem PNG ou JPEG para usar como papel timbrado de fundo nos relatórios PDF. O arquivo será exibido ocupando toda a folha A4.
              </div>

              {cfg.timbradoUrl && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lStyle}>Timbrado atual</label>
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cfg.timbradoUrl}
                      alt="Timbrado atual"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <button
                    onClick={handleRemoverTimbrado}
                    disabled={uploadando}
                    style={{
                      marginTop: 8,
                      padding: '6px 14px',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: uploadando ? 'not-allowed' : 'pointer',
                    }}
                  >
                    🗑️ Remover timbrado
                  </button>
                </div>
              )}

              <label
                style={{
                  display: 'block',
                  padding: '18px 14px',
                  background: uploadando ? '#f1f5f9' : 'rgba(26,35,126,0.04)',
                  border: `2px dashed ${uploadando ? '#cbd5e1' : '#1a237e'}`,
                  borderRadius: 10,
                  textAlign: 'center',
                  cursor: uploadando ? 'not-allowed' : 'pointer',
                  color: uploadando ? '#94a3b8' : '#1a237e',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                {uploadando ? '⏳ Enviando...' : cfg.timbradoUrl ? '📁 Substituir timbrado (PNG/JPEG)' : '📁 Selecionar timbrado (PNG/JPEG)'}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={uploadando}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) { handleTimbradoUpload(file) }
                    e.target.value = ''
                  }}
                />
              </label>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                Recomendado: A4 em PNG (2480×3508px para alta qualidade). O timbrado ocupa o fundo completo da folha PDF.
              </div>
            </div>
          )}

          {/* Sub-aba: Título */}
          {subTab === 'titulo' && (
            <>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                Nome completo da organização. Use Enter para quebrar linhas (ex.: linha 1 da hierarquia, linha 2...).
              </div>
              <FormField label="Texto do Título (multi-linha)">
                <textarea
                  rows={4}
                  value={cfg.tituloTexto}
                  onChange={(e) => setCfg((prev) => ({ ...prev, tituloTexto: e.target.value }))}
                  style={{ ...mInput, resize: 'vertical' }}
                  placeholder={'POLÍCIA PENAL FEDERAL\nPENITENCIÁRIA FEDERAL EM CATANDUVAS-PR\nGRUPO DE AÇÕES ESPECIAIS PENAIS-CATANDUVAS'}
                />
              </FormField>
              <StyleEditor
                label="Estilo do Título"
                value={cfg.tituloEstilo}
                onChange={(next) => setCfg((prev) => ({ ...prev, tituloEstilo: next }))}
              />
            </>
          )}

          {/* Sub-aba: Subtítulo */}
          {subTab === 'subtitulo' && (
            <>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                Tipo do documento — aparece abaixo do título, acima da legenda de metadados.
              </div>
              <FormField label="Texto do Subtítulo">
                <input
                  value={cfg.subtituloTexto}
                  onChange={(e) => setCfg((prev) => ({ ...prev, subtituloTexto: e.target.value }))}
                  style={mInput}
                  placeholder="RELATÓRIO DE ATIVIDADE(S)"
                />
              </FormField>
              <StyleEditor
                label="Estilo do Subtítulo"
                value={cfg.subtituloEstilo}
                onChange={(next) => setCfg((prev) => ({ ...prev, subtituloEstilo: next }))}
              />
            </>
          )}

          {/* Sub-aba: Descrição */}
          {subTab === 'descricao' && (
            <>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                Texto fixo opcional exibido antes do conteúdo do relatório (ex.: preâmbulo ou observação padrão).
              </div>
              <FormField label="Prefixo da Descrição (opcional)">
                <textarea
                  rows={3}
                  value={cfg.descricaoTexto}
                  onChange={(e) => setCfg((prev) => ({ ...prev, descricaoTexto: e.target.value }))}
                  style={{ ...mInput, resize: 'vertical' }}
                  placeholder="Deixe em branco para omitir."
                />
              </FormField>
              <StyleEditor
                label="Estilo da Descrição"
                value={cfg.descricaoEstilo}
                onChange={(next) => setCfg((prev) => ({ ...prev, descricaoEstilo: next }))}
              />
            </>
          )}

          {/* Sub-aba: Rodapé */}
          {subTab === 'rodape' && (
            <>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                Variáveis disponíveis: <code>{'{{GAEP}}'}</code> (código do GAEP), <code>{'{{VERSAO}}'}</code> (versão do documento).
              </div>
              <FormField label="Texto do Rodapé">
                <input
                  value={cfg.rodapeTexto}
                  onChange={(e) => setCfg((prev) => ({ ...prev, rodapeTexto: e.target.value }))}
                  style={mInput}
                  placeholder="{{GAEP}} · v{{VERSAO}}"
                />
              </FormField>
              <StyleEditor
                label="Estilo do Rodapé"
                value={cfg.rodapeEstilo}
                onChange={(next) => setCfg((prev) => ({ ...prev, rodapeEstilo: next }))}
              />
            </>
          )}

          {/* Sub-aba: Margens */}
          {subTab === 'margens' && (
            <>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                Distância em mm entre a borda da folha A4 e o início do conteúdo. O preview atualiza em tempo real.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="Superior (mm)">
                  <input type="number" min={0} max={80} step={0.5}
                    value={cfg.printMargins.top}
                    onChange={(e) => setCfg((prev) => ({ ...prev, printMargins: { ...prev.printMargins, top: Number(e.target.value) } }))}
                    style={mInput} />
                </FormField>
                <FormField label="Direita (mm)">
                  <input type="number" min={0} max={80} step={0.5}
                    value={cfg.printMargins.right}
                    onChange={(e) => setCfg((prev) => ({ ...prev, printMargins: { ...prev.printMargins, right: Number(e.target.value) } }))}
                    style={mInput} />
                </FormField>
                <FormField label="Inferior (mm)">
                  <input type="number" min={0} max={80} step={0.5}
                    value={cfg.printMargins.bottom}
                    onChange={(e) => setCfg((prev) => ({ ...prev, printMargins: { ...prev.printMargins, bottom: Number(e.target.value) } }))}
                    style={mInput} />
                </FormField>
                <FormField label="Esquerda (mm)">
                  <input type="number" min={0} max={80} step={0.5}
                    value={cfg.printMargins.left}
                    onChange={(e) => setCfg((prev) => ({ ...prev, printMargins: { ...prev.printMargins, left: Number(e.target.value) } }))}
                    style={mInput} />
                </FormField>
              </div>
            </>
          )}

          {/* Toggle de preview */}
          <button
            onClick={() => setShowPreview((v) => !v)}
            style={{
              width: '100%',
              padding: '10px',
              background: showPreview ? 'rgba(26,35,126,0.08)' : 'transparent',
              color: '#1a237e',
              border: '1px solid rgba(26,35,126,0.3)',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            {showPreview ? '▲ Ocultar Preview' : '👁 Ver Preview do Relatório'}
          </button>

          {showPreview && <PreviewRelatorio cfg={cfg} gaepCodigo={gaepCodigo} />}

          <button
            onClick={salvar}
            disabled={pending}
            style={{
              width: '100%',
              padding: 12,
              background: pending ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              marginTop: 14,
            }}
          >
            {pending ? '⏳ Salvando...' : '💾 Salvar formatação do relatório'}
          </button>
        </div>
      </AdminCard>
    </div>
  )
}

// ── Tab: Diárias ──────────────────────────────────────────────

function TabDiarias({
  initial,
  gaepId,
  operadorId,
}: {
  initial: DiariaRow[]
  gaepId: string
  operadorId: string
}) {
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
      id: 'relatorio',
      label: 'Relatório',
      comp: (
        <TabRelatorio
          gaepId={data.gaep.id}
          operadorId={data.operadorAtual.id}
          gaepCodigo={data.gaep.codigo}
          initial={data.configRelatorio}
        />
      ),
    },
    {
      id: 'diarias',
      label: 'Diárias',
      comp: (
        <TabDiarias
          initial={data.diarias}
          gaepId={data.gaep.id}
          operadorId={data.operadorAtual.id}
        />
      ),
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

  const tabParam = searchParams?.get('tab') ?? 'efetivo'
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
