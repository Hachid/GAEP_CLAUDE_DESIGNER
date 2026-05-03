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
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
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

/** Mock do contexto admin autenticado */
function mockAdminCtx() {
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: 'auth-admin' } }, error: null,
  })
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

// ── adicionarAtividade ─────────────────────────────────────────
describe('adicionarAtividade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminCtx()
    // Mock do contexto getAdminCtx: operadores → id, gaep_id, perfil
    mockAdminFrom.mockReturnValue(makeChain({
      data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null,
    }))
  })

  it('retorna erro quando nome está vazio', async () => {
    const { adicionarAtividade } = await import('../actions')
    const result = await adicionarAtividade('   ')
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('nome válido')
  })

  it('retorna erro quando atividade duplicada já existe', async () => {
    const { adicionarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: { id: 'atv-existente' }, error: null }, // duplicata encontrada
        ],
      })
    )

    const result = await adicionarAtividade('Ronda')

    expect(result.error).toContain('Já existe')
  })

  it('insere atividade e retorna id quando nome é único', async () => {
    const { adicionarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: null, error: null },           // sem duplicata
          { data: { id: 'atv-nova' }, error: null }, // insert retorna id
        ],
      })
    )

    const result = await adicionarAtividade('Nova Atividade')

    expect(result.error).toBeUndefined()
    expect(result.id).toBe('atv-nova')
  })

  it('chama revalidatePath("/gestao") após inserir', async () => {
    const { adicionarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: null, error: null },
          { data: { id: 'atv-nova' }, error: null },
        ],
      })
    )

    await adicionarAtividade('Nova Atividade')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/gestao')
  })

  it('chama revalidateTag("atividades-lookup") após inserir', async () => {
    const { adicionarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: null, error: null },
          { data: { id: 'atv-nova' }, error: null },
        ],
      })
    )

    await adicionarAtividade('Nova Atividade')

    expect(mockRevalidateTag).toHaveBeenCalledWith('atividades-lookup')
  })

  it('não chama revalidateTag quando há erro de duplicata', async () => {
    const { adicionarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: { data: { id: 'atv-existente' }, error: null },
      })
    )

    await adicionarAtividade('Ronda')

    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })
})

// ── editarAtividade ────────────────────────────────────────────
describe('editarAtividade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminCtx()
  })

  it('retorna erro quando nome está vazio', async () => {
    const { editarAtividade } = await import('../actions')

    mockAdminFrom.mockReturnValue(makeChain({
      data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null,
    }))

    const result = await editarAtividade('atv-1', '')
    expect(result.error).toContain('nome válido')
  })

  it('retorna erro quando nome já existe em outra atividade', async () => {
    const { editarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: { data: { id: 'atv-outra' }, error: null }, // duplicata em outra
      })
    )

    const result = await editarAtividade('atv-1', 'Ronda')

    expect(result.error).toContain('Já existe')
  })

  it('atualiza a atividade corretamente', async () => {
    const { editarAtividade } = await import('../actions')
    const atvChain = makeChain({ data: null, error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null })
      return atvChain
    })
    // Simula: busca duplicata retorna null (sem duplicata), update retorna null (sucesso)
    ;(atvChain.maybeSingle as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: null, error: null })

    const result = await editarAtividade('atv-1', 'Novo Nome')

    expect(result.error).toBeUndefined()
  })

  it('chama revalidateTag("atividades-lookup") após editar', async () => {
    const { editarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: null, error: null }, // sem duplicata
          { data: null, error: null }, // update ok
        ],
      })
    )

    await editarAtividade('atv-1', 'Nome Novo')

    expect(mockRevalidateTag).toHaveBeenCalledWith('atividades-lookup')
  })

  it('chama revalidatePath("/gestao") após editar', async () => {
    const { editarAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation(
      makeAdminMock({
        operadores: { data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null },
        atividades: [
          { data: null, error: null },
          { data: null, error: null },
        ],
      })
    )

    await editarAtividade('atv-1', 'Nome Novo')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/gestao')
  })
})

// ── removerAtividade ────────────────────────────────────────────
describe('removerAtividade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminCtx()
  })

  it('faz soft delete — define deleted_at e ativo=false', async () => {
    const { removerAtividade } = await import('../actions')
    const atvChain = makeChain({ data: null, error: null })

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null })
      return atvChain
    })

    await removerAtividade('atv-1')

    expect(atvChain.update).toHaveBeenCalled()
    const updateArg = (atvChain.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(updateArg).toHaveProperty('deleted_at')
    expect(updateArg).toHaveProperty('ativo', false)
  })

  it('chama revalidateTag("atividades-lookup") após remover', async () => {
    const { removerAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null })
      return makeChain({ data: null, error: null })
    })

    await removerAtividade('atv-1')

    expect(mockRevalidateTag).toHaveBeenCalledWith('atividades-lookup')
  })

  it('chama revalidatePath("/gestao") após remover', async () => {
    const { removerAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null })
      return makeChain({ data: null, error: null })
    })

    await removerAtividade('atv-1')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/gestao')
  })

  it('retorna objeto vazio em caso de sucesso', async () => {
    const { removerAtividade } = await import('../actions')

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'operadores') return makeChain({ data: { id: 'op-1', gaep_id: 'gaep-1', perfil: 'ADMIN' }, error: null })
      return makeChain({ data: null, error: null })
    })

    const result = await removerAtividade('atv-1')

    expect(result).toEqual({})
    expect(result.error).toBeUndefined()
  })
})
