// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted) ────────────────────────────────────────────
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: unknown[]) => Promise<unknown>>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
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
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
  }
  return self
}

// ── Testes ─────────────────────────────────────────────────────

describe('lib/cache/queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getCategorias ──────────────────────────────────────────────
  describe('getCategorias', () => {
    it('consulta a tabela categorias_atividade', async () => {
      const { getCategorias } = await import('../queries')
      mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }))

      await getCategorias()

      expect(mockAdminFrom).toHaveBeenCalledWith('categorias_atividade')
    })

    it('seleciona apenas id e nome', async () => {
      const { getCategorias } = await import('../queries')
      const ch = makeChain({ data: [], error: null })
      mockAdminFrom.mockReturnValue(ch)

      await getCategorias()

      expect(ch.select).toHaveBeenCalledWith('id, nome')
    })

    it('ordena categorias por prioridade operacional (TREINAR, OPERAR, INSTRUIR)', async () => {
      const { getCategorias } = await import('../queries')
      const ch = makeChain({
        data: [
          { id: 'c2', nome: 'OPERAR' },
          { id: 'c3', nome: 'INSTRUIR' },
          { id: 'c1', nome: 'TREINAR' },
        ],
        error: null,
      })
      mockAdminFrom.mockReturnValue(ch)

      const result = await getCategorias()

      expect(result.map((c) => c.nome)).toEqual(['TREINAR', 'OPERAR', 'INSTRUIR'])
    })

    it('retorna array vazio quando data é null', async () => {
      const { getCategorias } = await import('../queries')
      mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }))

      const result = await getCategorias()

      expect(result).toEqual([])
    })

    it('retorna lista de categorias corretamente', async () => {
      const { getCategorias } = await import('../queries')
      const cats = [{ id: 'c1', nome: 'Missão' }, { id: 'c2', nome: 'Patrulhamento' }]
      mockAdminFrom.mockReturnValue(makeChain({ data: cats, error: null }))

      const result = await getCategorias()

      expect(result).toEqual(cats)
    })

    it('retorna array tipado como { id, nome }[]', async () => {
      const { getCategorias } = await import('../queries')
      mockAdminFrom.mockReturnValue(makeChain({
        data: [{ id: 'c1', nome: 'Missão', extra: 'ignorado' }],
        error: null,
      }))

      const result = await getCategorias()

      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('nome')
    })
  })

  // ── getAtividades ──────────────────────────────────────────────
  describe('getAtividades', () => {
    it('consulta a tabela atividades', async () => {
      const { getAtividades } = await import('../queries')
      mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }))

      await getAtividades()

      expect(mockAdminFrom).toHaveBeenCalledWith('atividades')
    })

    it('seleciona apenas id e nome', async () => {
      const { getAtividades } = await import('../queries')
      const ch = makeChain({ data: [], error: null })
      mockAdminFrom.mockReturnValue(ch)

      await getAtividades()

      expect(ch.select).toHaveBeenCalledWith('id, nome')
    })

    it('filtra registros com deleted_at null (soft delete)', async () => {
      const { getAtividades } = await import('../queries')
      const ch = makeChain({ data: [], error: null })
      mockAdminFrom.mockReturnValue(ch)

      await getAtividades()

      expect(ch.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('ordena por nome', async () => {
      const { getAtividades } = await import('../queries')
      const ch = makeChain({ data: [], error: null })
      mockAdminFrom.mockReturnValue(ch)

      await getAtividades()

      expect(ch.order).toHaveBeenCalledWith('nome')
    })

    it('retorna array vazio quando data é null', async () => {
      const { getAtividades } = await import('../queries')
      mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }))

      const result = await getAtividades()

      expect(result).toEqual([])
    })

    it('retorna lista de atividades corretamente', async () => {
      const { getAtividades } = await import('../queries')
      const atvs = [{ id: 'a1', nome: 'Ronda' }, { id: 'a2', nome: 'Fiscalização' }]
      mockAdminFrom.mockReturnValue(makeChain({ data: atvs, error: null }))

      const result = await getAtividades()

      expect(result).toEqual(atvs)
    })
  })
})
