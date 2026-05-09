// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted) ────────────────────────────────────────────
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: unknown[]) => Promise<unknown>>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

const mockAuthGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockAuthGetUser },
  }),
}))

const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}))

// ── Helpers ────────────────────────────────────────────────────

type MockResult = { data: unknown; error: unknown }

function makeChain(result: MockResult = { data: null, error: null }) {
  const self: Record<string, unknown> = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    is: vi.fn(() => self),
    order: vi.fn(() => self),
    limit: vi.fn(() => self),
    in: vi.fn(() => self),
    gte: vi.fn(() => self),
    lte: vi.fn(() => self),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
  }
  return self
}

function makeAdminMock(responses: Record<string, MockResult | MockResult[]>) {
  const counters: Record<string, number> = {}
  return vi.fn().mockImplementation((table: string) => {
    const resp = responses[table]
    if (!resp) return makeChain({ data: null, error: null })
    if (Array.isArray(resp)) {
      const idx = counters[table] ?? 0
      counters[table] = idx + 1
      return makeChain(resp[idx] ?? { data: null, error: null })
    }
    return makeChain(resp)
  })
}

// ── Fixtures ───────────────────────────────────────────────────

const filtrosMesAtual = {
  dataInicio: '2026-04-01',
  dataFim: '2026-04-30',
  categoriaId: '',
  atividadeId: '',
}

// Relatórios para KPI com atividade e categoria
const relatoriosKPI = [
  {
    id: 'r1', hora_inicio: '08:00', hora_fim: '12:00',
    atividade_id: 'atv-1', relatorista_id: 'op-1',
    atividades: { id: 'atv-1', nome: 'Ronda' },
    categorias_atividade: { id: 'cat-1', nome: 'MISSÃO' },
  },
  {
    id: 'r2', hora_inicio: '14:00', hora_fim: '18:00',
    atividade_id: 'atv-1', relatorista_id: 'op-2',
    atividades: { id: 'atv-1', nome: 'Ronda' },
    categorias_atividade: { id: 'cat-1', nome: 'MISSÃO' },
  },
  {
    id: 'r3', hora_inicio: '08:00', hora_fim: '10:00',
    atividade_id: 'atv-2', relatorista_id: 'op-1',
    atividades: { id: 'atv-2', nome: 'Patrulhamento' },
    categorias_atividade: { id: 'cat-2', nome: 'POLICIAMENTO' },
  },
]

const operadoresKPI = [
  { id: 'op-1', nome: 'João Silva', numerica: '001' },
  { id: 'op-2', nome: 'Maria Santos', numerica: '002' },
]

// ── fetchKPIData ───────────────────────────────────────────────
describe('fetchKPIData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('é uma função exportada (wrapped com unstable_cache)', async () => {
    const { fetchKPIData } = await import('../actions')
    expect(typeof fetchKPIData).toBe('function')
  })

  it('retorna KPIData com estrutura correta', async () => {
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatoriosKPI, error: null },
        operadores: { data: operadoresKPI, error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    expect(result).toHaveProperty('totalRegistros')
    expect(result).toHaveProperty('totalMinutos')
    expect(result).toHaveProperty('porCategoria')
    expect(result).toHaveProperty('rankingAtividades')
    expect(result).toHaveProperty('rankingOperadores')
  })

  it('computa totalRegistros corretamente', async () => {
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatoriosKPI, error: null },
        operadores: { data: operadoresKPI, error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    expect(result.totalRegistros).toBe(3)
  })

  it('computa totalMinutos somando os turnos', async () => {
    const { fetchKPIData } = await import('../actions')
    // r1: 08:00-12:00 = 240 min, r2: 14:00-18:00 = 240 min, r3: 08:00-10:00 = 120 min
    // Total = 600 min
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatoriosKPI, error: null },
        operadores: { data: operadoresKPI, error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    expect(result.totalMinutos).toBe(600)
  })

  it('agrupa categorias e ordena por totalMinutos desc', async () => {
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatoriosKPI, error: null },
        operadores: { data: operadoresKPI, error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    // MISSÃO: 240+240=480 min (2 registros), POLICIAMENTO: 120 min (1 registro)
    expect(result.porCategoria[0].nome).toBe('MISSÃO')
    expect(result.porCategoria[0].totalMinutos).toBe(480)
    expect(result.porCategoria[1].nome).toBe('POLICIAMENTO')
    expect(result.porCategoria[1].totalMinutos).toBe(120)
  })

  it('mantém ranking separado por (categoria, atividade): mesma atividade em duas categorias', async () => {
    const mesmoAtividadeDuasCats = [
      {
        id: 'r-a',
        data: '2026-04-01',
        hora_inicio: '08:00',
        hora_fim: '10:00',
        plantao: null,
        data_fim: null,
        atividade_id: 'atv-x',
        relatorista_id: null,
        atividades: { id: 'atv-x', nome: 'Patrulhamento' },
        categorias_atividade: { id: 'cat-op', nome: 'OPERAR' },
      },
      {
        id: 'r-b',
        data: '2026-04-02',
        hora_inicio: '14:00',
        hora_fim: '16:00',
        plantao: null,
        data_fim: null,
        atividade_id: 'atv-x',
        relatorista_id: null,
        atividades: { id: 'atv-x', nome: 'Patrulhamento' },
        categorias_atividade: { id: 'cat-ins', nome: 'INSTRUIR' },
      },
    ]
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: mesmoAtividadeDuasCats, error: null },
        operadores: { data: [], error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    const instruir = result.rankingAtividades.find((a) => a.categoriaNome === 'INSTRUIR')
    const operar = result.rankingAtividades.find((a) => a.categoriaNome === 'OPERAR')
    expect(instruir?.nome).toBe('Patrulhamento')
    expect(instruir?.totalMinutos).toBe(120)
    expect(operar?.nome).toBe('Patrulhamento')
    expect(operar?.totalMinutos).toBe(120)
    expect(result.rankingAtividades).toHaveLength(2)
  })

  it('ordena ranking de operadores por totalMinutos desc', async () => {
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatoriosKPI, error: null },
        operadores: { data: operadoresKPI, error: null },
      })
    )

    const result = await fetchKPIData('gaep-1', filtrosMesAtual)

    // op-1: 240+120=360 min, op-2: 240 min → op-1 é primeiro
    expect(result.rankingOperadores[0].id).toBe('op-1')
    expect(result.rankingOperadores[0].totalMinutos).toBe(360)
    expect(result.rankingOperadores[1].id).toBe('op-2')
  })

  it('aplica filtro por categoriaId', async () => {
    const { fetchKPIData } = await import('../actions')
    const chain = makeChain({ data: relatoriosKPI, error: null })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'relatorios') return chain
      return makeChain({ data: operadoresKPI, error: null })
    })

    await fetchKPIData('gaep-1', { ...filtrosMesAtual, categoriaId: 'cat-1' })

    expect(chain.eq).toHaveBeenCalledWith('categoria_id', 'cat-1')
  })

  it('aplica filtro por atividadeId', async () => {
    const { fetchKPIData } = await import('../actions')
    const chain = makeChain({ data: relatoriosKPI, error: null })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'relatorios') return chain
      return makeChain({ data: operadoresKPI, error: null })
    })

    await fetchKPIData('gaep-1', { ...filtrosMesAtual, atividadeId: 'atv-1' })

    expect(chain.eq).toHaveBeenCalledWith('atividade_id', 'atv-1')
  })

  it('retorna KPI vazio quando não há relatórios', async () => {
    const { fetchKPIData } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }))

    const result = await fetchKPIData('gaep-vazio', filtrosMesAtual)

    expect(result.totalRegistros).toBe(0)
    expect(result.totalMinutos).toBe(0)
    expect(result.porCategoria).toHaveLength(0)
    expect(result.rankingOperadores).toHaveLength(0)
  })
})

// ── fetchEvolucao ──────────────────────────────────────────────
describe('fetchEvolucao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('é uma função exportada (wrapped com unstable_cache)', async () => {
    const { fetchEvolucao } = await import('../actions')
    expect(typeof fetchEvolucao).toBe('function')
  })

  it('retorna array de EvolucaoMes', async () => {
    const { fetchEvolucao } = await import('../actions')
    const rows = [
      { data: '2026-04-15', hora_inicio: '08:00', hora_fim: '12:00' },
      { data: '2026-04-20', hora_inicio: '14:00', hora_fim: '18:00' },
    ]
    mockAdminFrom.mockReturnValue(makeChain({ data: rows, error: null }))

    const result = await fetchEvolucao('gaep-1')

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    result.forEach(mes => {
      expect(mes).toHaveProperty('mes')
      expect(mes).toHaveProperty('label')
      expect(mes).toHaveProperty('minutos')
      expect(mes).toHaveProperty('registros')
    })
  })

  it('agrupa relatórios do mesmo mês', async () => {
    const { fetchEvolucao } = await import('../actions')
    const rows = [
      { data: '2026-04-01', hora_inicio: '08:00', hora_fim: '10:00' },
      { data: '2026-04-15', hora_inicio: '14:00', hora_fim: '16:00' },
    ]
    mockAdminFrom.mockReturnValue(makeChain({ data: rows, error: null }))

    const result = await fetchEvolucao('gaep-1')

    const abril = result.find(m => m.mes === '2026-04')
    expect(abril).toBeDefined()
    expect(abril?.registros).toBe(2)
    expect(abril?.minutos).toBe(240) // 120 + 120
  })

  it('retorna meses em ordem cronológica', async () => {
    const { fetchEvolucao } = await import('../actions')
    const rows = [
      { data: '2026-04-10', hora_inicio: '08:00', hora_fim: '10:00' },
      { data: '2026-03-05', hora_inicio: '08:00', hora_fim: '12:00' },
      { data: '2026-02-20', hora_inicio: '09:00', hora_fim: '13:00' },
    ]
    mockAdminFrom.mockReturnValue(makeChain({ data: rows, error: null }))

    const result = await fetchEvolucao('gaep-1')

    for (let i = 1; i < result.length; i++) {
      expect(result[i].mes >= result[i - 1].mes).toBe(true)
    }
  })

  it('retorna array vazio quando não há dados', async () => {
    const { fetchEvolucao } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }))

    const result = await fetchEvolucao('gaep-sem-dados')

    expect(result).toEqual([])
  })

  it('filtra apenas últimos 12 meses', async () => {
    const { fetchEvolucao } = await import('../actions')
    const ch = makeChain({ data: [], error: null })
    mockAdminFrom.mockReturnValue(ch)

    await fetchEvolucao('gaep-1')

    // Deve usar .gte('data', dataCorte) para limitar a 12 meses
    expect(ch.gte).toHaveBeenCalled()
    const gteArg = (ch.gte as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(gteArg[0]).toBe('data')
  })
})

// ── refreshKPIData ─────────────────────────────────────────────
describe('refreshKPIData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna erro quando não autenticado', async () => {
    const { refreshKPIData } = await import('../actions')
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await refreshKPIData(filtrosMesAtual)

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('retorna KPIData com usuário autenticado', async () => {
    const { refreshKPIData } = await import('../actions')
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: [
          { data: { gaep_id: 'gaep-1' }, error: null },
          { data: operadoresKPI, error: null },
        ],
        relatorios: { data: [], error: null },
      })
    )

    const result = await refreshKPIData(filtrosMesAtual)

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('totalRegistros')
  })

  it('retorna erro quando operador não é encontrado', async () => {
    const { refreshKPIData } = await import('../actions')
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await refreshKPIData(filtrosMesAtual)

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })
})
