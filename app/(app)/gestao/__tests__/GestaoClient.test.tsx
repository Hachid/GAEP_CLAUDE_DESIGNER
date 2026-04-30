import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GestaoClient, type GestaoData } from '../GestaoClient'

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
      descricaoTexto: '',
      rodapeTexto: '{{GAEP}}',
      tituloEstilo: { fontFamily: 'Times New Roman', fontColor: '#000000', align: 'center', indent: 0, lineHeight: 1.4 },
      descricaoEstilo: { fontFamily: 'Times New Roman', fontColor: '#111827', align: 'justify', indent: 12, lineHeight: 1.8 },
      rodapeEstilo: { fontFamily: 'Times New Roman', fontColor: '#6b7280', align: 'right', indent: 0, lineHeight: 1.3 },
    },
    diarias: [],
    gaeps: [],
    ...overrides,
  }
}

function tabStripButtons() {
  return screen.getAllByRole('button').filter((btn) => {
    const t = btn.textContent ?? ''
    return /^(👮|📋|📅|🤖|💰|🌐)\s/.test(t)
  })
}

describe('GestaoClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('com perfil ADMIN renderiza 5 abas (sem GAEPs)', () => {
    render(<GestaoClient data={baseData()} />)
    expect(tabStripButtons()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /🌐\s*GAEPs/ })).not.toBeInTheDocument()
  })

  it('com perfil SUPER_ADMIN renderiza 6 abas (com GAEPs)', () => {
    render(
      <GestaoClient
        data={baseData({
          operadorAtual: { id: 'op-sa', nome: 'Super', perfil: 'SUPER_ADMIN' },
        })}
      />
    )
    expect(tabStripButtons()).toHaveLength(6)
    expect(screen.getByRole('button', { name: /🌐\s*GAEPs/ })).toBeInTheDocument()
  })

  it('badge ADMIN: cor #1a237e e ícone ⚙️', () => {
    render(<GestaoClient data={baseData()} />)
    const title = screen.getByText(/⚙️ ADMIN — GAEP-CAT/)
    expect(title).toBeInTheDocument()
    expect(title).toHaveStyle({ color: '#1a237e' })
  })

  it('badge SUPER_ADMIN: cor #7c3aed e ícone 🔑', () => {
    render(
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
      {
        id: '1',
        nome: 'Ana Silva',
        matricula: '101',
        perfil: 'OPERADOR',
        equipe: 'Alpha',
        ativo: true,
        email_funcional: null,
      },
      {
        id: '2',
        nome: 'Bruno Costa',
        matricula: '102',
        perfil: 'SUPERVISOR',
        equipe: 'Bravo',
        ativo: true,
        email_funcional: null,
      },
    ]
    render(<GestaoClient data={baseData({ operadores })} />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
  })

  it('TabEfetivo: busca filtra por nome', async () => {
    const user = userEvent.setup()
    const operadores = [
      {
        id: '1',
        nome: 'Carlos Alfa',
        matricula: '201',
        perfil: 'OPERADOR',
        equipe: 'Alpha',
        ativo: true,
        email_funcional: null,
      },
      {
        id: '2',
        nome: 'Daniel Beta',
        matricula: '202',
        perfil: 'OPERADOR',
        equipe: 'Alpha',
        ativo: true,
        email_funcional: null,
      },
    ]
    render(<GestaoClient data={baseData({ operadores })} />)
    const search = screen.getByPlaceholderText(/Buscar operador/)
    await user.type(search, 'daniel')
    expect(screen.queryByText('Carlos Alfa')).not.toBeInTheDocument()
    expect(screen.getByText('Daniel Beta')).toBeInTheDocument()
  })

  it('TabEfetivo: botão "+ Novo Operador" abre modal', async () => {
    const user = userEvent.setup()
    render(<GestaoClient data={baseData()} />)
    await user.click(screen.getByRole('button', { name: '+ Novo Operador' }))
    expect(screen.getByText('Novo Operador')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nome do operador')).toBeInTheDocument()
  })

  it('TabFeriados lista feriados vindos das props', async () => {
    const user = userEvent.setup()
    const feriados = [
      { id: 'f1', data: '2026-04-21', descricao: 'Tiradentes' },
      { id: 'f2', data: '2026-12-25', descricao: 'Natal' },
    ]
    render(<GestaoClient data={baseData({ feriados })} />)
    await user.click(screen.getByRole('button', { name: /📅\s*Feriados/ }))
    expect(screen.getByText('Tiradentes')).toBeInTheDocument()
    expect(screen.getByText('Natal')).toBeInTheDocument()
  })

  it('TabDiarias exibe valor formatado como R$ 425,00', async () => {
    const user = userEvent.setup()
    const diarias = [
      {
        id: 'd1',
        tipo: 'Deslocamento',
        locais: 'Interior',
        valor: 425,
        vigencia: '2026-01-01',
      },
    ]
    render(<GestaoClient data={baseData({ diarias })} />)
    await user.click(screen.getByRole('button', { name: /💰\s*Diárias/ }))
    const money = screen.getByText('R$ 425,00')
    expect(money).toBeInTheDocument()
    expect(money).toHaveStyle({ color: '#16a34a' })
  })
})
