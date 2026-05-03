// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted) ────────────────────────────────────────────
const mockRevalidatePath = vi.fn()
const mockRevalidateTag = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
  unstable_cache: <T extends (...args: unknown[]) => Promise<unknown>>(fn: T) => fn,
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
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
    not: vi.fn(() => self),
    order: vi.fn(() => self),
    limit: vi.fn(() => self),
    in: vi.fn(() => self),
    ilike: vi.fn(() => self),
    neq: vi.fn(() => self),
    gte: vi.fn(() => self),
    lte: vi.fn(() => self),
    insert: vi.fn(() => self),
    update: vi.fn(() => self),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
  }
  return self
}

/** Cria mock do admin que retorna respostas por tabela (com fila para múltiplas chamadas) */
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

const mockUserAutenticado = { data: { user: { id: 'auth-1' } }, error: null }
const mockUserNaoAutenticado = { data: { user: null }, error: { message: 'unauthorized' } }

const relatorioBase = {
  id: 'rel-1',
  gaep_id: 'gaep-1',
  data: '2026-04-30',
  hora_inicio: '08:00:00',
  hora_fim: '12:00:00',
  horas_totais: 4,
  categoria_id: 'cat-1',
  atividade_id: 'atv-1',
  relatorista_id: 'op-1',
  descricao_bruta: 'Bruta',
  descricao_revisada: 'Revisada',
  ocorrencias: null,
  fotos_urls: null,
  outros_integrantes: null,
  versao: 1,
  created_at: '2026-04-30T08:00:00Z',
  updated_at: '2026-04-30T08:00:00Z',
}

// ── buscarRelatorio ─────────────────────────────────────────────
describe('buscarRelatorio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue(mockUserAutenticado)
  })

  it('retorna erro quando sessão é inválida', async () => {
    const { buscarRelatorio } = await import('../actions')
    mockAuthGetUser.mockResolvedValue(mockUserNaoAutenticado)

    const result = await buscarRelatorio('rel-1')

    expect(result.error).toBe('Sessão expirada.')
    expect(result.data).toBeUndefined()
  })

  it('retorna erro quando relatório não é encontrado', async () => {
    const { buscarRelatorio } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: 'not found' } }))

    const result = await buscarRelatorio('rel-inexistente')

    expect(result.error).toBe('Relatório não encontrado.')
  })

  it('não usa select("*") — passa campos explícitos', async () => {
    const { buscarRelatorio } = await import('../actions')

    const relChain = makeChain({ data: relatorioBase, error: null })
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'relatorios') return relChain
      return makeChain({ data: null, error: null })
    })

    await buscarRelatorio('rel-1')

    const selectArg = (relChain.select as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
    expect(selectArg).not.toBe('*')
    expect(selectArg).toContain('id')
    expect(selectArg).toContain('descricao_revisada')
    expect(selectArg).toContain('fotos_urls')
    expect(selectArg).toContain('gaep_id')
  })

  it('busca categoria, atividade, relatorista em paralelo com participantes e versoes', async () => {
    const { buscarRelatorio } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatorioBase, error: null },
        categorias_atividade: { data: { nome: 'MISSÃO' }, error: null },
        atividades: { data: { nome: 'Ronda' }, error: null },
        operadores: [
          { data: { nome: 'João Silva' }, error: null },
          { data: [{ id: 'op-1', nome: 'João Silva' }], error: null },
          { data: [], error: null },
        ],
        relatorio_participantes: { data: [{ operador_id: 'op-1' }], error: null },
        relatorio_versoes: { data: [], error: null },
      })
    )

    const result = await buscarRelatorio('rel-1')

    expect(result.error).toBeUndefined()
    expect(result.data?.categoria_nome).toBe('MISSÃO')
    expect(result.data?.atividade_nome).toBe('Ronda')
    expect(result.data?.relatorista_nome).toBe('João Silva')
    expect(result.data?.participantes).toHaveLength(1)
    expect(result.data?.participantes[0].nome).toBe('João Silva')
  })

  it('retorna shape completo de RelatorioDetalhado', async () => {
    const { buscarRelatorio } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relatorioBase, error: null },
        categorias_atividade: { data: { nome: 'MISSÃO' }, error: null },
        atividades: { data: { nome: 'Ronda' }, error: null },
        operadores: [
          { data: { nome: 'João Silva' }, error: null },
          { data: [], error: null },
          { data: [], error: null },
        ],
        relatorio_participantes: { data: [], error: null },
        relatorio_versoes: { data: [], error: null },
      })
    )

    const result = await buscarRelatorio('rel-1')

    expect(result.data).toMatchObject({
      id: 'rel-1',
      gaep_id: 'gaep-1',
      data: '2026-04-30',
      hora_inicio: '08:00:00',
      hora_fim: '12:00:00',
      horas_totais: 4,
      versao: 1,
      participantes: [],
      versoes: [],
    })
  })

  it('lida com relatorio sem categoria, atividade ou relatorista', async () => {
    const { buscarRelatorio } = await import('../actions')
    const relSemIds = {
      ...relatorioBase,
      categoria_id: null,
      atividade_id: null,
      relatorista_id: null,
    }

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: relSemIds, error: null },
        relatorio_participantes: { data: [], error: null },
        relatorio_versoes: { data: [], error: null },
      })
    )

    const result = await buscarRelatorio('rel-1')

    expect(result.error).toBeUndefined()
    expect(result.data?.categoria_nome).toBeNull()
    expect(result.data?.atividade_nome).toBeNull()
    expect(result.data?.relatorista_nome).toBeNull()
  })
})

// ── buscarHistoricoRelatorios ───────────────────────────────────
describe('buscarHistoricoRelatorios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue(mockUserAutenticado)
  })

  it('retorna erro quando sessão é inválida', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    mockAuthGetUser.mockResolvedValue(mockUserNaoAutenticado)

    const result = await buscarHistoricoRelatorios('gaep-1')

    expect(result.error).toBe('Sessão expirada.')
  })

  it('aplica limit(200) na query de relatórios', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    const relChain = makeChain({ data: [], error: null })
    mockAdminFrom.mockReturnValue(relChain)

    await buscarHistoricoRelatorios('gaep-1')

    expect(relChain.limit).toHaveBeenCalledWith(200)
  })

  it('filtra por gaep_id e exclui deletados', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    const relChain = makeChain({ data: [], error: null })
    mockAdminFrom.mockReturnValue(relChain)

    await buscarHistoricoRelatorios('gaep-42')

    expect(relChain.eq).toHaveBeenCalledWith('gaep_id', 'gaep-42')
    expect(relChain.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('ordena por data descending', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    const relChain = makeChain({ data: [], error: null })
    mockAdminFrom.mockReturnValue(relChain)

    await buscarHistoricoRelatorios('gaep-1')

    expect(relChain.order).toHaveBeenCalledWith('data', { ascending: false })
  })

  it('resolve nomes de categoria, atividade e relatorista via batch', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    const rows = [{
      id: 'r1', data: '2026-04-30', hora_inicio: '08:00:00', hora_fim: '12:00:00',
      horas_totais: 4, categoria_id: 'cat-1', atividade_id: 'atv-1',
      relatorista_id: 'op-1', versao: 1, created_at: '2026-04-30T08:00:00Z',
    }]

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        relatorios: { data: rows, error: null },
        categorias_atividade: { data: [{ id: 'cat-1', nome: 'MISSÃO' }], error: null },
        atividades: { data: [{ id: 'atv-1', nome: 'Ronda' }], error: null },
        operadores: { data: [{ id: 'op-1', nome: 'João Silva' }], error: null },
      })
    )

    const result = await buscarHistoricoRelatorios('gaep-1')

    expect(result.error).toBeUndefined()
    expect(result.data?.[0].categoria_nome).toBe('MISSÃO')
    expect(result.data?.[0].atividade_nome).toBe('Ronda')
    expect(result.data?.[0].relatorista_nome).toBe('João Silva')
  })

  it('retorna array vazio quando não há relatórios', async () => {
    const { buscarHistoricoRelatorios } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }))

    const result = await buscarHistoricoRelatorios('gaep-vazio')

    expect(result.data).toEqual([])
  })
})

// ── salvarRelatorio ────────────────────────────────────────────
describe('salvarRelatorio', () => {
  const inputValido = {
    gaepId: 'gaep-1',
    relatoristId: 'op-1',
    data: '2026-04-30',
    horaInicio: '08:00',
    horaFim: '12:00',
    horasTotais: 4,
    categoriaId: 'cat-1',
    atividadeId: 'atv-1',
    outrosIntegrantes: '',
    descricaoBruta: 'Bruta',
    descricaoRevisada: 'Descrição revisada completa.',
    ocorrencias: '',
    fotosUrls: [],
    equipe: ['op-1'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue(mockUserAutenticado)
  })

  it('retorna erro quando sessão é inválida', async () => {
    const { salvarRelatorio } = await import('../actions')
    mockAuthGetUser.mockResolvedValue(mockUserNaoAutenticado)

    const result = await salvarRelatorio(inputValido)

    expect(result.error).toContain('Sessão expirada')
  })

  it('retorna erro quando data não é informada', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, data: '' })
    expect(result.error).toContain('Data')
  })

  it('retorna erro quando horário inicial não é informado', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, horaInicio: '' })
    expect(result.error).toContain('Horário')
  })

  it('retorna erro quando categoria não é informada', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, categoriaId: '' })
    expect(result.error).toContain('Categoria')
  })

  it('retorna erro quando atividade não é informada', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, atividadeId: '' })
    expect(result.error).toContain('Atividade')
  })

  it('retorna erro quando equipe está vazia', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, equipe: [] })
    expect(result.error).toContain('operador')
  })

  it('retorna erro quando descrição revisada está vazia', async () => {
    const { salvarRelatorio } = await import('../actions')
    const result = await salvarRelatorio({ ...inputValido, descricaoRevisada: '   ' })
    expect(result.error).toContain('descrição')
  })

  it('chama revalidatePath e revalidateTag ao salvar com sucesso', async () => {
    const { salvarRelatorio } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 'rel-novo' }, error: null }))

    await salvarRelatorio(inputValido)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/relatorio')
    expect(mockRevalidateTag).toHaveBeenCalledWith('relatorios-kpi')
  })

  it('retorna o id do relatório criado', async () => {
    const { salvarRelatorio } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 'rel-novo-123' }, error: null }))

    const result = await salvarRelatorio(inputValido)

    expect(result.id).toBe('rel-novo-123')
    expect(result.error).toBeUndefined()
  })
})

// ── editarRelatorio ────────────────────────────────────────────
describe('editarRelatorio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue(mockUserAutenticado)
  })

  it('retorna erro quando sessão é inválida', async () => {
    const { editarRelatorio } = await import('../actions')
    mockAuthGetUser.mockResolvedValue(mockUserNaoAutenticado)

    const result = await editarRelatorio({
      id: 'rel-1', descricaoRevisada: 'Nova', motivo: '', operadorId: 'op-1',
    })

    expect(result.error).toContain('Sessão')
  })

  it('retorna erro quando descrição está vazia', async () => {
    const { editarRelatorio } = await import('../actions')

    const result = await editarRelatorio({
      id: 'rel-1', descricaoRevisada: '', motivo: '', operadorId: 'op-1',
    })

    expect(result.error).toContain('descrição')
  })

  it('retorna erro quando operador não é ADMIN', async () => {
    const { editarRelatorio } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: { perfil: 'OPERADOR' }, error: null }))

    const result = await editarRelatorio({
      id: 'rel-1', descricaoRevisada: 'Nova descrição', motivo: '', operadorId: 'op-comum',
    })

    expect(result.error).toContain('administradores')
  })

  it('chama revalidateTag("relatorios-kpi") ao editar com sucesso', async () => {
    const { editarRelatorio } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { perfil: 'ADMIN' }, error: null },
        relatorios: [
          { data: { descricao_revisada: 'Antiga', versao: 1 }, error: null },
          { data: null, error: null },
        ],
        relatorio_versoes: { data: null, error: null },
      })
    )

    await editarRelatorio({
      id: 'rel-1', descricaoRevisada: 'Nova descrição', motivo: 'Correção', operadorId: 'op-1',
    })

    expect(mockRevalidateTag).toHaveBeenCalledWith('relatorios-kpi')
  })
})

// ── excluirRelatorio ────────────────────────────────────────────
describe('excluirRelatorio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue(mockUserAutenticado)
  })

  it('retorna erro quando sessão é inválida', async () => {
    const { excluirRelatorio } = await import('../actions')
    mockAuthGetUser.mockResolvedValue(mockUserNaoAutenticado)

    const result = await excluirRelatorio({ id: 'rel-1', operadorId: 'op-1' })

    expect(result.error).toContain('Sessão')
  })

  it('retorna erro quando operador não é ADMIN', async () => {
    const { excluirRelatorio } = await import('../actions')
    mockAdminFrom.mockReturnValue(makeChain({ data: { perfil: 'OPERADOR' }, error: null }))

    const result = await excluirRelatorio({ id: 'rel-1', operadorId: 'op-comum' })

    expect(result.error).toContain('administradores')
  })

  it('faz soft delete — atualiza deleted_at em vez de deletar', async () => {
    const { excluirRelatorio } = await import('../actions')
    const ch = makeChain({ data: null, error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { perfil: 'ADMIN' }, error: null })
      return ch
    })

    await excluirRelatorio({ id: 'rel-1', operadorId: 'op-admin' })

    // Deve usar UPDATE com deleted_at, nunca DELETE
    expect(ch.update).toHaveBeenCalled()
    const updateArg = (ch.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(updateArg).toHaveProperty('deleted_at')
    expect(updateArg.deleted_at).toBeTruthy()
  })

  it('chama revalidateTag("relatorios-kpi") ao excluir', async () => {
    const { excluirRelatorio } = await import('../actions')

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { perfil: 'ADMIN' }, error: null })
      return makeChain({ data: null, error: null })
    })

    await excluirRelatorio({ id: 'rel-1', operadorId: 'op-admin' })

    expect(mockRevalidateTag).toHaveBeenCalledWith('relatorios-kpi')
  })

  it('chama revalidatePath("/relatorio/historico")', async () => {
    const { excluirRelatorio } = await import('../actions')

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { perfil: 'ADMIN' }, error: null })
      return makeChain({ data: null, error: null })
    })

    await excluirRelatorio({ id: 'rel-1', operadorId: 'op-admin' })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/relatorio/historico')
  })
})
