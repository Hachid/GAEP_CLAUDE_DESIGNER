import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VariavelMesProvider } from '@/lib/variavelMes'
import { GestaoClient, type GestaoData, type OperadorRow } from '../GestaoClient'

const navMock = vi.hoisted(() => {
  const searchParams = new URLSearchParams('tab=efetivo')
  return {
    searchParams,
    setGestaoTab(tab: string) {
      searchParams.delete('tab')
      searchParams.set('tab', tab)
    },
    resetGestaoTab() {
      searchParams.delete('tab')
      searchParams.set('tab', 'efetivo')
    },
  }
})

vi.mock('next/navigation', () => ({
  useSearchParams: () => navMock.searchParams,
}))

vi.mock('@/app/convite/actions', () => ({
  gerarConviteEfetivo: vi.fn().mockResolvedValue({
    url: 'https://example.test/convite/token-test',
    expiresAt: '2099-01-01T00:00:00.000Z',
  }),
}))

function renderGestao(node: ReactNode) {
  return render(<VariavelMesProvider>{node}</VariavelMesProvider>)
}

vi.mock('../actions', () => ({
  criarOperador: vi.fn().mockResolvedValue({ id: 'new-id' }),
  editarOperador: vi.fn().mockResolvedValue({}),
  toggleAtivoOperador: vi.fn().mockResolvedValue({}),
  adicionarAtividade: vi.fn().mockResolvedValue({ id: 'a-new' }),
  removerAtividade: vi.fn().mockResolvedValue({}),
  adicionarFeriado: vi.fn().mockResolvedValue({ id: 'f-new' }),
  removerFeriado: vi.fn().mockResolvedValue({}),
  salvarDiasUteisMes: vi.fn().mockResolvedValue({}),
  salvarConfigIA: vi.fn().mockResolvedValue({}),
  salvarConfigRelatorio: vi.fn().mockResolvedValue({}),
  testarPromptIA: vi.fn().mockResolvedValue({ resultado: 'ok' }),
  editarDiaria: vi.fn().mockResolvedValue({}),
  adicionarGaep: vi.fn().mockResolvedValue({ id: 'g-new' }),
  toggleAtivoGaep: vi.fn().mockResolvedValue({}),
}))

function baseData(overrides: Partial<GestaoData> = {}): GestaoData {
  return {
    operadorAtual: { id: 'op-admin', nome: 'Gestor', perfil: 'ADMIN' },
    gaep: { id: 'gaep-1', codigo: 'GAEP-CAT', cidade: 'Catanduvas', estado: 'PR' },
    operadores: [],
    categorias: [{ id: 'cat-1', nome: 'OPERAR' }],
    atividades: [],
    feriados: [],
    diasUteisMes: [],
    configIA: {
      id: null,
      modelo: 'gpt-4o',
      temperatura: 0.3,
      prompt: 'prompt',
    },
    configRelatorio: {
      id: null,
      tituloTexto: 'RELATÓRIO OPERACIONAL',
      subtituloTexto: '',
      descricaoTexto: '',
      rodapeTexto: '{{GAEP}}',
      tituloEstilo: { fontFamily: 'Times New Roman', fontColor: '#000000', align: 'center', indent: 0, lineHeight: 1.4 },
      subtituloEstilo: { fontFamily: 'Times New Roman', fontColor: '#111827', align: 'center', indent: 0, lineHeight: 1.4 },
      descricaoEstilo: { fontFamily: 'Times New Roman', fontColor: '#111827', align: 'justify', indent: 12, lineHeight: 1.8 },
      rodapeEstilo: { fontFamily: 'Times New Roman', fontColor: '#6b7280', align: 'right', indent: 0, lineHeight: 1.3 },
      timbradoUrl: null,
      printMargins: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
    },
    diarias: [],
    gaeps: [],
    ...overrides,
  }
}

function makeOperador(partial: Partial<OperadorRow> & Pick<OperadorRow, 'id' | 'nome' | 'matricula' | 'perfil'>): OperadorRow {
  return {
    id: partial.id,
    nome: partial.nome,
    nome_completo: partial.nome_completo ?? null,
    matricula: partial.matricula,
    perfil: partial.perfil,
    equipe: partial.equipe ?? null,
    ativo: partial.ativo ?? true,
    email_funcional: partial.email_funcional ?? null,
    numerica: partial.numerica ?? null,
    tipo_sanguineo: partial.tipo_sanguineo ?? null,
    alergia: partial.alergia ?? null,
    contato_emergencia: partial.contato_emergencia ?? null,
    nome_contato_emergencia: partial.nome_contato_emergencia ?? null,
    plano_saude: partial.plano_saude ?? null,
    numero_carteirinha: partial.numero_carteirinha ?? null,
    cpf: partial.cpf ?? null,
    email: partial.email ?? null,
  }
}

describe('GestaoClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navMock.resetGestaoTab()
  })

  it('com perfil ADMIN exibe aba Efetivo por padrão (tab=efetivo)', () => {
    renderGestao(<GestaoClient data={baseData()} />)
    expect(screen.getByText(/Operadores/)).toBeInTheDocument()
  })

  it('com perfil SUPER_ADMIN exibe aba GAEPs quando tab=gaeps', () => {
    navMock.setGestaoTab('gaeps')
    renderGestao(
      <GestaoClient
        data={baseData({
          operadorAtual: { id: 'op-sa', nome: 'Super', perfil: 'SUPER_ADMIN' },
        })}
      />
    )
    expect(screen.getByText(/Unidades GAEP/)).toBeInTheDocument()
  })

  it('badge ADMIN: cor #1a237e e ícone ⚙️', () => {
    renderGestao(<GestaoClient data={baseData()} />)
    const title = screen.getByText(/⚙️ ADMIN — GAEP-CAT/)
    expect(title).toBeInTheDocument()
    expect(title).toHaveStyle({ color: '#1a237e' })
  })

  it('badge SUPER_ADMIN: cor #7c3aed e ícone 🔑', () => {
    renderGestao(
      <GestaoClient
        data={baseData({
          operadorAtual: { id: 'op-sa', nome: 'Super', perfil: 'SUPER_ADMIN' },
        })}
      />
    )
    const title = screen.getByText(/🔑 SUPER ADMIN — Acesso Total/)
    expect(title).toBeInTheDocument()
    expect(title).toHaveStyle({ color: '#7c3aed' })
  })

  it('TabEfetivo lista operadores vindos das props', () => {
    const operadores = [
      makeOperador({ id: '1', nome: 'Ana Silva', matricula: '101', perfil: 'OPERADOR', equipe: 'Alpha' }),
      makeOperador({ id: '2', nome: 'Bruno Costa', matricula: '102', perfil: 'SUPERVISOR', equipe: 'Bravo' }),
    ]
    renderGestao(<GestaoClient data={baseData({ operadores })} />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
  })

  it('TabEfetivo: busca filtra por nome', async () => {
    const user = userEvent.setup()
    const operadores = [
      makeOperador({ id: '1', nome: 'Carlos Alfa', matricula: '201', perfil: 'OPERADOR', equipe: 'Alpha' }),
      makeOperador({ id: '2', nome: 'Daniel Beta', matricula: '202', perfil: 'OPERADOR', equipe: 'Alpha' }),
    ]
    renderGestao(<GestaoClient data={baseData({ operadores })} />)
    const search = screen.getByPlaceholderText(/Buscar operador/)
    await user.type(search, 'daniel')
    expect(screen.queryByText('Carlos Alfa')).not.toBeInTheDocument()
    expect(screen.getByText('Daniel Beta')).toBeInTheDocument()
  })

  it('TabEfetivo exibe seção Convite ao efetivo', () => {
    renderGestao(<GestaoClient data={baseData()} />)
    expect(screen.getByText(/Convite ao efetivo/)).toBeInTheDocument()
    expect(screen.getByText(/O link é válido por 7 dias/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Link de Convite/i })).toBeInTheDocument()
  })

  it('TabEfetivo: botão "+ Novo Operador" abre modal', async () => {
    const user = userEvent.setup()
    renderGestao(<GestaoClient data={baseData()} />)
    await user.click(screen.getByRole('button', { name: '+ Novo Operador' }))
    expect(screen.getByText('Novo Operador')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nome do operador')).toBeInTheDocument()
  })

  it('TabFeriados lista feriados vindos das props', () => {
    navMock.setGestaoTab('feriados')
    const feriados = [
      { id: 'f1', data: '2026-04-21', descricao: 'Tiradentes' },
      { id: 'f2', data: '2026-12-25', descricao: 'Natal' },
    ]
    renderGestao(<GestaoClient data={baseData({ feriados })} />)
    expect(screen.getByText('Tiradentes')).toBeInTheDocument()
    expect(screen.getByText('Natal')).toBeInTheDocument()
  })

  it('TabDiarias exibe valor formatado como R$ 425,00', () => {
    navMock.setGestaoTab('diarias')
    const diarias = [
      {
        id: 'd1',
        tipo: 'Deslocamento',
        locais: 'Interior',
        valor: 425,
        vigencia: '2026-01-01',
      },
    ]
    renderGestao(<GestaoClient data={baseData({ diarias })} />)
    const money = screen.getByText('R$ 425,00')
    expect(money).toBeInTheDocument()
    expect(money).toHaveStyle({ color: '#16a34a' })
  })
})
