'use client'

import { useEffect, useState, useTransition } from 'react'
import { useVariavelMes, cargaHorariaTotalHoras } from '@/lib/variavelMes'
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
  salvarDiasUteisMes,
  salvarConfigIA,
  salvarConfigRelatorio,
  salvarTimbradoBase64,
  removerTimbrado,
  testarPromptIA,
  editarDiaria,
  adicionarGaep,
  editarGaep,
  excluirGaep,
  toggleAtivoGaep,
  importarRelatoriosCsv,
} from './actions'
import { gerarConviteEfetivo } from '@/app/convite/actions'
import { LogsTab } from './LogsTab'
import { DadosPessoaisTab } from './DadosPessoaisTab'
import { DEFAULT_TITULO_RELATORIO_INSTITUCIONAL } from '@/lib/pdf/defaultTituloRelatorio'
import { emailSistemaFromMatricula } from '@/lib/email-sistema'

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

export interface DiasUteisMesRow {
  id: string
  referenciaMes: string
  diasUteis: number
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

export type GestaoModo = 'full' | 'self-only'

export interface GestaoData {
  gestaoModo?: GestaoModo
  /** Linha do operador logado (aba Dados Pessoais). */
  operadorPessoal: OperadorRow
  operadorAtual: { id: string; nome: string; perfil: string }
  gaep: { id: string; codigo: string; cidade: string; estado: string }
  operadores: OperadorRow[]
  categorias: { id: string; nome: string }[]
  atividades: AtividadeRow[]
  feriados: FeriadoRow[]
  diasUteisMes: DiasUteisMesRow[]
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
type ModalMode = 'add' | OperadorRow | null

function TabEfetivo({
  gaepId,
  gaepCodigo,
  initial,
  isSuperAdmin,
  gaepsConvite,
}: {
  gaepId: string
  gaepCodigo: string
  initial: OperadorRow[]
  isSuperAdmin: boolean
  /** Lista de unidades (Super Admin) para escolher o GAEP do convite antes de gerar o link. */
  gaepsConvite: GaepRow[]
}) {
  const [ops, setOps] = useState<OperadorRow[]>(initial)
  const [modal, setModal] = useState<ModalMode>(null)
  const [conviteUrl, setConviteUrl] = useState('')
  const [conviteExpIso, setConviteExpIso] = useState('')
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
  const [convitePending, startConviteTransition] = useTransition()
  const [conviteGaepAlvoId, setConviteGaepAlvoId] = useState('')

  const precisaEscolherGaepConvite = isSuperAdmin && gaepsConvite.length > 0
  const codigoGaepConviteExibido =
    precisaEscolherGaepConvite && conviteGaepAlvoId
      ? gaepsConvite.find((g) => g.id === conviteGaepAlvoId)?.codigo ?? '…'
      : gaepCodigo

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
            email_funcional: form.matricula.trim() ? emailSistemaFromMatricula(form.matricula) : null,
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
                  email_funcional: form.matricula.trim()
                    ? emailSistemaFromMatricula(form.matricula)
                    : x.email_funcional,
                }
              : x
          )
        )
        showToast('✅ Operador atualizado!')
        setModal(null)
      }
    })
  }

  function gerarLinkConvite() {
    startConviteTransition(async () => {
      const alvo = precisaEscolherGaepConvite ? conviteGaepAlvoId : gaepId
      if (precisaEscolherGaepConvite && !alvo) {
        showToast('❌ Selecione o GAEP do convite.')
        return
      }
      const res = await gerarConviteEfetivo(alvo)
      if (res?.error) {
        showToast(`❌ ${res.error}`)
        return
      }
      if (res?.url) {
        setConviteUrl(res.url)
        setConviteExpIso(res.expiresAt ?? '')
        showToast('✅ Link gerado — copie e envie ao convidado.')
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
        <SectionHeader title="Convite ao efetivo" />
        <div
          style={{
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: '#64748b',
            lineHeight: 1.55,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {precisaEscolherGaepConvite ? (
            <>
              Escolha abaixo o <strong>GAEP do convite</strong> e depois gere o link. O convidado cadastra-se{' '}
              <strong>somente nessa unidade</strong> (não escolhe GAEP no formulário).
            </>
          ) : (
            <>
              Gere um link para um policial concluir o cadastro em{' '}
              <strong style={{ color: '#1e293b' }}>{gaepCodigo}</strong>.
            </>
          )}{' '}
          O convidado preenche o mesmo cadastro da gestão (sempre como <strong>OPERADOR</strong>); só o Super Admin altera perfil depois.
          Login com <strong>nome de guerra</strong>; senha = matrícula se não definir outra senha inicial.{' '}
          <strong>O link é válido por 7 dias.</strong>
          {precisaEscolherGaepConvite && conviteGaepAlvoId ? (
            <span>
              {' '}
              Unidade do link: <strong style={{ color: '#1e293b' }}>{codigoGaepConviteExibido}</strong>.
            </span>
          ) : null}
        </div>
        <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {precisaEscolherGaepConvite ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="convite-gaep-alvo" style={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b' }}>
                GAEP do convite
              </label>
              <select
                id="convite-gaep-alvo"
                value={conviteGaepAlvoId}
                onChange={(e) => {
                  setConviteGaepAlvoId(e.target.value)
                  setConviteUrl('')
                  setConviteExpIso('')
                }}
                style={{
                  ...mInput,
                  minHeight: 44,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#f8fafc',
                }}
              >
                <option value="">Selecione o GAEP…</option>
                {gaepsConvite
                  .filter((g) => g.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.codigo} — {g.cidade}/{g.estado}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <button
            type="button"
            onClick={gerarLinkConvite}
            disabled={pending || convitePending || (precisaEscolherGaepConvite && !conviteGaepAlvoId)}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor:
                pending || convitePending || (precisaEscolherGaepConvite && !conviteGaepAlvoId)
                  ? 'not-allowed'
                  : 'pointer',
              minHeight: 44,
            }}
          >
            {convitePending ? 'Gerando…' : 'Gerar link de convite'}
          </button>
          {conviteUrl ? (
            <>
              <input
                readOnly
                value={conviteUrl}
                onFocus={(e) => e.target.select()}
                aria-label="URL do convite"
                style={{ ...mInput, fontSize: '0.78rem' }}
              />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(conviteUrl).then(
                    () => showToast('✅ Link copiado.'),
                    () => showToast('❌ Não foi possível copiar.')
                  )
                }}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Copiar link
              </button>
              {conviteExpIso ? (
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                  Válido até {new Date(conviteExpIso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </AdminCard>

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
          {isSuperAdmin ? (
            <FormField label="E-mail do sistema">
              <input
                readOnly
                tabIndex={-1}
                value={form.matricula.trim() ? emailSistemaFromMatricula(form.matricula) : '—'}
                style={{ ...mInput, background: '#e2e8f0', color: '#475569' }}
                aria-describedby="hint-email-sistema"
              />
              <p id="hint-email-sistema" style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                Gerado automaticamente a partir da matrícula (conta interna de autenticação).
              </p>
            </FormField>
          ) : null}
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
          {isSuperAdmin ? (
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
          ) : (
            <p
              style={{
                margin: '0 0 10px 0',
                padding: '10px 12px',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: '#475569',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}
            >
              {modal === 'add' ? (
                <>
                  O cadastro será criado como <strong>OPERADOR</strong>. Somente{' '}
                  <strong>Super Admin</strong> altera perfil (permissões) depois.
                </>
              ) : (
                <>
                  <strong>Perfil:</strong> {form.perfil}. Somente <strong>Super Admin</strong> altera
                  permissões.
                </>
              )}
            </p>
          )}
          <FormField label="Numérica">
            <input
              value={form.numerica}
              onChange={(e) => setForm((f) => ({ ...f, numerica: e.target.value }))}
              style={mInput}
              placeholder="01"
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
                placeholder="Ex. Unimed ou SUS"
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
            <FormField label="E-mail pessoal">
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

function TabFeriados({
  gaepId,
  initial,
  initialDiasUteisMes,
}: {
  gaepId: string
  initial: FeriadoRow[]
  initialDiasUteisMes: DiasUteisMesRow[]
}) {
  const [feriados, setFeriados] = useState<FeriadoRow[]>(initial)
  const [diasUteisMes, setDiasUteisMes] = useState<DiasUteisMesRow[]>(initialDiasUteisMes)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ data: '', descricao: '' })
  const [formDiasUteis, setFormDiasUteis] = useState(() => {
    const hoje = new Date()
    return { referenciaMes: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`, diasUteis: '22' }
  })
  const [toast, setToast] = useState('')
  const [pending, startTransition] = useTransition()
  const { upsertDiasUteisMes, setMesReferenciaFiltro } = useVariavelMes()
  const [linhaDraft, setLinhaDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    setMesReferenciaFiltro(formDiasUteis.referenciaMes)
  }, [formDiasUteis.referenciaMes, setMesReferenciaFiltro])

  useEffect(() => {
    setLinhaDraft((prev) => {
      const next = { ...prev }
      for (const d of diasUteisMes) {
        next[d.referenciaMes] = String(d.diasUteis)
      }
      return next
    })
  }, [diasUteisMes])

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

  function salvarDiasUteis() {
    const referenciaMes = formDiasUteis.referenciaMes.trim()
    const diasUteis = Number(formDiasUteis.diasUteis)
    if (!/^\d{4}-\d{2}$/.test(referenciaMes) || !Number.isFinite(diasUteis)) return
    startTransition(async () => {
      const res = await salvarDiasUteisMes(gaepId, referenciaMes, diasUteis)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      const diasFinal = Math.max(0, Math.min(31, Math.round(diasUteis)))
      setDiasUteisMes((prev) => {
        const next = [...prev]
        const idx = next.findIndex((r) => r.referenciaMes === referenciaMes)
        const row: DiasUteisMesRow = {
          id: idx >= 0 ? next[idx].id : `${referenciaMes}-${gaepId}`,
          referenciaMes,
          diasUteis: diasFinal,
        }
        if (idx >= 0) next[idx] = row
        else next.push(row)
        return next.sort((a, b) => b.referenciaMes.localeCompare(a.referenciaMes))
      })
      upsertDiasUteisMes(referenciaMes, diasFinal)
      showToast('✅ Dias úteis do mês salvos!')
    })
  }

  function salvarDiasUteisLinha(referenciaMes: string, diasBruto: number) {
    if (!/^\d{4}-\d{2}$/.test(referenciaMes) || !Number.isFinite(diasBruto)) return
    startTransition(async () => {
      const res = await salvarDiasUteisMes(gaepId, referenciaMes, diasBruto)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      const diasFinal = Math.max(0, Math.min(31, Math.round(diasBruto)))
      setDiasUteisMes((prev) => {
        const next = [...prev]
        const idx = next.findIndex((r) => r.referenciaMes === referenciaMes)
        const row: DiasUteisMesRow = {
          id: idx >= 0 ? next[idx].id : `${referenciaMes}-${gaepId}`,
          referenciaMes,
          diasUteis: diasFinal,
        }
        if (idx >= 0) next[idx] = row
        else next.push(row)
        return next.sort((a, b) => b.referenciaMes.localeCompare(a.referenciaMes))
      })
      upsertDiasUteisMes(referenciaMes, diasFinal)
      showToast(`✅ ${referenciaMes} atualizado`)
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
        <SectionHeader title="Dias úteis por mês (base de saldo)" />
        <div style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr auto', gap: 10 }}>
            <input
              type="month"
              value={formDiasUteis.referenciaMes}
              onChange={(e) => setFormDiasUteis((f) => ({ ...f, referenciaMes: e.target.value }))}
              style={mInput}
            />
            <input
              type="number"
              min={0}
              max={31}
              value={formDiasUteis.diasUteis}
              onChange={(e) => setFormDiasUteis((f) => ({ ...f, diasUteis: e.target.value }))}
              style={mInput}
              placeholder="Dias úteis"
            />
            <button
              onClick={salvarDiasUteis}
              disabled={pending}
              style={{
                padding: '8px 12px',
                background: pending ? '#94a3b8' : '#1a237e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              💾 Salvar
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#64748b' }}>
            Esses valores alimentam o cálculo de carga horária prevista (7h × dias úteis) e saldo mensal no desempenho do operador.
          </div>
          {diasUteisMes.length > 0 && (
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
                gap: 8,
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              {diasUteisMes.map((d) => {
                const raw = linhaDraft[d.referenciaMes] ?? String(d.diasUteis)
                const n = Number(raw)
                const horasTotais = Number.isFinite(n) ? cargaHorariaTotalHoras(n) : 0
                return (
                  <div
                    key={d.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 10px',
                      background: '#f8fafc',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{d.referenciaMes}</div>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                      Dias úteis
                      <input
                        type="number"
                        min={0}
                        max={31}
                        value={raw}
                        onChange={(e) =>
                          setLinhaDraft((prev) => ({ ...prev, [d.referenciaMes]: e.target.value }))
                        }
                        style={{ ...mInput, marginTop: 4 }}
                      />
                    </label>
                    <div style={{ fontSize: '0.82rem', color: '#1a237e', fontWeight: 700 }}>
                      Carga do mês: {Number.isFinite(n) ? `${horasTotais} h` : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => salvarDiasUteisLinha(d.referenciaMes, n)}
                      disabled={pending || !Number.isFinite(n)}
                      style={{
                        padding: '8px 10px',
                        background: pending || !Number.isFinite(n) ? '#94a3b8' : '#1a237e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: pending || !Number.isFinite(n) ? 'not-allowed' : 'pointer',
                        fontSize: '0.78rem',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </AdminCard>

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
    textAlign: 'center',
    marginLeft: `${cfg.tituloEstilo.indent}px`,
    lineHeight: 1.15,
    fontSize: '13.5pt',
    fontWeight: cfg.tituloEstilo.bold === false ? 'normal' : 'bold',
    fontStyle: cfg.tituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.tituloEstilo.underline ? 'underline' : 'none',
    marginTop: cfg.tituloEstilo.marginTop ? `${cfg.tituloEstilo.marginTop}mm` : undefined,
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'pre-line',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
  }
  const stStyle: React.CSSProperties = {
    fontFamily: cfg.subtituloEstilo.fontFamily,
    color: cfg.subtituloEstilo.fontColor,
    textAlign: 'center',
    marginLeft: `${cfg.subtituloEstilo.indent}px`,
    lineHeight: 1.22,
    fontSize: '10pt',
    fontWeight: cfg.subtituloEstilo.bold === false ? 'normal' : 'bold',
    fontStyle: cfg.subtituloEstilo.italic ? 'italic' : 'normal',
    textDecoration: cfg.subtituloEstilo.underline ? 'underline' : 'none',
    marginTop: '8pt',
    marginBottom: 0,
    paddingBottom: '7pt',
    borderBottom: '1.25px solid #334155',
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
            {/* Cabeçalho: título + subtítulo à esquerda, reserva à direita (brasão no PDF) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 120px',
                columnGap: '4mm',
                alignItems: 'start',
                marginBottom: '3mm',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={tStyle}>{cfg.tituloTexto || DEFAULT_TITULO_RELATORIO_INSTITUCIONAL}</div>
                <div style={stStyle}>INSTRUIR — Patrulhamento</div>
              </div>
              <div style={{ minHeight: 90 }} aria-hidden />
            </div>
            {/* Legenda operacional (espelha PDF: 5 colunas) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                width: '100%',
                marginBottom: '3mm',
                border: '0.6pt solid #94a3b8',
                borderRadius: 2,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {[
                { label: 'Data', value: '02/05/2026' },
                { label: 'Período', value: '08:00 às 15:00' },
                { label: 'Duração', value: '7h' },
                { label: 'Categoria', value: 'INSTRUIR' },
                { label: 'Atividade', value: 'Patrulhamento' },
              ].map((cell, i, arr) => (
                <div
                  key={cell.label}
                  style={{
                    flex: '1 1 18%',
                    minWidth: 0,
                    borderRight: i < arr.length - 1 ? '0.5pt solid #cbd5e1' : undefined,
                  }}
                >
                  <div
                    style={{
                      background: '#dbeafe',
                      color: '#475569',
                      fontSize: '6.25pt',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.055em',
                      padding: '3pt 5pt',
                      borderBottom: '0.5pt solid #94a3b8',
                    }}
                  >
                    {cell.label}
                  </div>
                  <div
                    style={{
                      fontSize: '8.25pt',
                      fontWeight: 700,
                      color: '#0f172a',
                      padding: '4pt 5pt 5pt 5pt',
                      lineHeight: 1.32,
                    }}
                  >
                    {cell.value}
                  </div>
                </div>
              ))}
            </div>
            {/* Bloco descrição: borda + equipe + rótulo + texto (espelha PDF) */}
            <div
              style={{
                border: '0.75pt solid #0f172a',
                padding: '12pt 14pt 14pt 14pt',
                marginBottom: '3mm',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: '9.5pt', color: '#0f172a', lineHeight: 1.4, marginBottom: '6pt', fontWeight: 500 }}>
                Alex, Boza, Ernesto, Fiorentini, Hachid, Maia, Minotto, Regis, Rocco, Stadler
              </div>
              <div
                style={{
                  fontSize: '8pt',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#64748b',
                  marginTop: '8pt',
                  marginBottom: '6pt',
                }}
              >
                DESCRIÇÃO DA ATIVIDADE
              </div>
              <div style={{ ...dStyle, whiteSpace: 'pre-wrap' as const, margin: 0 }}>
                {cfg.descricaoTexto ||
                  'O texto do relatório operacional será exibido aqui com a formatação configurada pelo administrador do sistema.'}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 4 }} />
            <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
              <div style={{ marginBottom: '5pt', fontSize: '10.5pt', fontWeight: 700, color: '#0f172a' }}>Hachid</div>
              <div style={{ borderTop: '0.6pt solid #0f172a', width: '55%', margin: '0 auto', height: 0 }} />
              <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '4pt' }}>Relatorista — assinatura</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '8pt',
                borderTop: '0.5pt solid #cbd5e1',
                paddingTop: '8pt',
                paddingBottom: '6mm',
                marginBottom: '2mm',
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontSize: '8pt',
                  lineHeight: 1.38,
                  color: 'rgba(0,0,0,0.44)',
                  textAlign: 'left',
                  paddingRight: '2mm',
                  paddingBottom: '1mm',
                }}
              >
                <div style={{ marginBottom: '4pt', wordBreak: 'break-all' as const }}>
                  <strong style={{ color: 'rgba(0,0,0,0.58)' }}>Autenticidade:</strong> CD62F139C051BF61
                </div>
                <div>
                  Gerado em: 02/05/2026, 19:41 · v1 ·{' '}
                  {cfg.rodapeTexto.replace('{{GAEP}}', gaepCodigo).replace('{{VERSAO}}', '1')}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  background: '#f1f5f9',
                  border: '0.5pt solid #cbd5e1',
                  fontSize: '6pt',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                QR
              </div>
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
                  placeholder={DEFAULT_TITULO_RELATORIO_INSTITUCIONAL}
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
                Tipo do documento — aparece abaixo do título, acima da legenda. Placeholders opcionais:{' '}
                <code>{'{{CATEGORIA}}'}</code>, <code>{'{{ATIVIDADE}}'}</code>, <code>{'{{GAEP}}'}</code>.
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

function TabDiarias({ initial, gaepId, operadorId }: { initial: DiariaRow[]; gaepId: string; operadorId: string }) {
  void gaepId
  void operadorId
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
  const [editTarget, setEditTarget] = useState<GaepRow | null>(null)
  const [editForm, setEditForm] = useState({ codigo: '', cidade: '', estado: '' })
  const [deleteTarget, setDeleteTarget] = useState<GaepRow | null>(null)
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
      showToast(`✅ ${g.codigo} ${g.ativo ? 'desativada' : 'ativada'}.`)
    })
  }

  function abrirEditar(g: GaepRow) {
    setEditForm({ codigo: g.codigo, cidade: g.cidade, estado: g.estado })
    setEditTarget(g)
  }

  function salvarEdicao() {
    if (!editTarget || !editForm.codigo.trim() || !editForm.cidade.trim() || !editForm.estado.trim()) return
    startTransition(async () => {
      const res = await editarGaep(editTarget.id, editForm)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      const updated = { ...editForm, estado: editForm.estado.toUpperCase() }
      setGaeps((prev) => prev.map((x) => x.id === editTarget.id ? { ...x, ...updated } : x))
      showToast(`✅ ${updated.codigo} atualizada!`)
      setEditTarget(null)
    })
  }

  function confirmarExclusao() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await excluirGaep(deleteTarget.id)
      if (res.error) { showToast(`❌ ${res.error}`); return }
      setGaeps((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      showToast(`✅ ${deleteTarget.codigo} excluída.`)
      setDeleteTarget(null)
    })
  }

  const btnBase: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 7, fontWeight: 700, fontSize: '0.72rem',
    cursor: pending ? 'not-allowed' : 'pointer', border: '1px solid transparent',
    fontFamily: 'inherit', lineHeight: 1,
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
            style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: g.ativo ? 'rgba(26,35,126,0.08)' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1rem' }}>🏛️</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: g.ativo ? '#1a237e' : '#94a3b8' }}>
                  {g.codigo}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: 20, fontWeight: 700,
                    background: g.ativo ? 'rgba(22,163,74,0.1)' : 'rgba(148,163,184,0.15)',
                    color: g.ativo ? '#16a34a' : '#94a3b8',
                    border: `1px solid ${g.ativo ? 'rgba(22,163,74,0.3)' : '#e2e8f0'}`,
                  }}
                >
                  {g.ativo ? 'ATIVA' : 'INATIVA'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {g.cidade} / {g.estado}
              </div>
            </div>
            {/* Ações */}
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button
                onClick={() => abrirEditar(g)}
                disabled={pending}
                style={{ ...btnBase, background: 'rgba(26,35,126,0.07)', color: '#1a237e', border: '1px solid rgba(26,35,126,0.2)' }}
                title="Editar unidade"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleteTarget(g)}
                disabled={pending}
                style={{ ...btnBase, background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                title="Excluir unidade"
              >
                🗑️
              </button>
              <button
                onClick={() => handleToggle(g)}
                disabled={pending}
                style={{
                  ...btnBase,
                  background: g.ativo ? 'rgba(239,68,68,0.07)' : 'rgba(22,163,74,0.07)',
                  color: g.ativo ? '#dc2626' : '#16a34a',
                  border: `1px solid ${g.ativo ? 'rgba(239,68,68,0.2)' : 'rgba(22,163,74,0.2)'}`,
                }}
                title={g.ativo ? 'Desativar' : 'Ativar'}
              >
                {g.ativo ? '🔒' : '✅'}
              </button>
            </div>
          </div>
        ))}
        {gaeps.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhuma unidade cadastrada
          </div>
        )}
      </AdminCard>

      {/* Modal: Nova Unidade */}
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
              width: '100%', padding: 14, background: pending ? '#94a3b8' : '#7c3aed',
              color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'inherit',
            }}
          >
            {pending ? '⏳ Cadastrando...' : 'Cadastrar Unidade'}
          </button>
        </Modal>
      )}

      {/* Modal: Editar Unidade */}
      {editTarget && (
        <Modal title={`Editar ${editTarget.codigo}`} onClose={() => setEditTarget(null)}>
          <FormField label="Código da Unidade">
            <input
              value={editForm.codigo}
              onChange={(e) => setEditForm((f) => ({ ...f, codigo: e.target.value }))}
              style={mInput}
              placeholder="Ex: GAEP-XXX"
              autoFocus
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Cidade">
              <input
                value={editForm.cidade}
                onChange={(e) => setEditForm((f) => ({ ...f, cidade: e.target.value }))}
                style={mInput}
                placeholder="Cidade"
              />
            </FormField>
            <FormField label="Estado">
              <input
                value={editForm.estado}
                onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value }))}
                style={mInput}
                placeholder="UF"
                maxLength={2}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setEditTarget(null)}
              style={{
                flex: 1, padding: 13, background: 'transparent', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={salvarEdicao}
              disabled={pending || !editForm.codigo.trim() || !editForm.cidade.trim() || !editForm.estado.trim()}
              style={{
                flex: 2, padding: 13, background: pending ? '#94a3b8' : '#1a237e',
                color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {pending ? '⏳ Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar Exclusão */}
      {deleteTarget && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: 8 }}>
              Excluir <span style={{ color: '#dc2626' }}>{deleteTarget.codigo}</span>?
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              Esta operação usa soft delete — a unidade será marcada como excluída mas os dados históricos são preservados.
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>
              {deleteTarget.cidade} / {deleteTarget.estado}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setDeleteTarget(null)}
              style={{
                flex: 1, padding: 13, background: 'transparent', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarExclusao}
              disabled={pending}
              style={{
                flex: 1, padding: 13, background: pending ? '#94a3b8' : '#dc2626',
                color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {pending ? '⏳...' : '🗑️ Excluir'}
            </button>
          </div>
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
  const modoSelfOnly = data.gestaoModo === 'self-only'
  const searchParams = useSearchParams()
  const { mergeDiasUteisMes } = useVariavelMes()

  useEffect(() => {
    mergeDiasUteisMes(
      data.diasUteisMes.map((r) => ({ referenciaMes: r.referenciaMes, diasUteis: r.diasUteis }))
    )
  }, [data.diasUteisMes, mergeDiasUteisMes])

  const tabDadosPessoais: Tab = {
    id: 'dados-pessoais',
    label: 'Dados Pessoais',
    comp: (
      <DadosPessoaisTab initial={data.operadorPessoal} perfil={data.operadorAtual.perfil} />
    ),
  }

  const tabsAdmin: Tab[] = [
    {
      id: 'efetivo',
      label: 'Efetivo',
      comp: (
        <TabEfetivo
          gaepId={data.gaep.id}
          gaepCodigo={data.gaep.codigo}
          initial={data.operadores}
          isSuperAdmin={isSuperAdmin}
          gaepsConvite={data.gaeps}
        />
      ),
    },
    {
      id: 'atividades',
      label: 'Atividades',
      comp: <TabAtividades initialAtividades={data.atividades} categorias={data.categorias} />,
    },
    {
      id: 'feriados',
      label: 'Feriados',
      comp: <TabFeriados gaepId={data.gaep.id} initial={data.feriados} initialDiasUteisMes={data.diasUteisMes} />,
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
      ? [
          { id: 'gaeps', label: 'GAEPs', comp: <TabGAEPs initial={data.gaeps} /> },
          { id: 'logs', label: 'Logs', comp: <LogsTab /> },
        ]
      : []),
  ]

  const tabs: Tab[] = modoSelfOnly ? [tabDadosPessoais] : [tabDadosPessoais, ...tabsAdmin]

  const tabParamDefault = modoSelfOnly ? 'dados-pessoais' : 'efetivo'
  const tabParam = searchParams?.get('tab') ?? tabParamDefault
  const current = tabs.find((t) => t.id === tabParam) ?? tabs[0]

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
            {modoSelfOnly
              ? `👤 ${data.operadorAtual.perfil} — Dados pessoais`
              : isSuperAdmin
                ? '🔑 SUPER ADMIN — Acesso Total'
                : `⚙️ ADMIN — ${data.gaep.codigo}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {data.operadorAtual.nome} ·{' '}
            {modoSelfOnly
              ? `${data.gaep.codigo} · ${data.gaep.cidade}/${data.gaep.estado}`
              : isSuperAdmin
                ? 'Todos os GAEPs'
                : `${data.gaep.codigo} · ${data.gaep.cidade}/${data.gaep.estado}`}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div key={current?.id}>{current?.comp}</div>
    </div>
  )
}
