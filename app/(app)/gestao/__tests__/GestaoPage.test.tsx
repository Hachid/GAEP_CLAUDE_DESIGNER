import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

function chainOperadorMaybeSingle(result: { data: unknown; error: unknown }) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    is: vi.fn(() => self),
    order: vi.fn(() => self),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return self
}

describe('GestaoPage (page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redireciona OPERADOR sem tab para /gestao?tab=dados-pessoais', async () => {
    const { redirect } = await import('next/navigation')
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const GestaoPage = (await import('../page')).default

    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-1' } },
          error: null,
        }),
      },
    } as never)

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        chainOperadorMaybeSingle({
          data: {
            id: 'op1',
            nome: 'Operador Comum',
            perfil: 'OPERADOR',
            gaep_id: 'g1',
            gaeps: { id: 'g1', codigo: 'GAEP-X', cidade: 'X', estado: 'PR' },
          },
          error: null,
        })
      ),
    } as never)

    await expect(GestaoPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'REDIRECT:/gestao?tab=dados-pessoais'
    )
    expect(redirect).toHaveBeenCalledWith('/gestao?tab=dados-pessoais')
  }, 15000)

  it('redireciona ADMIN de tab=gaeps para efetivo', async () => {
    const { redirect } = await import('next/navigation')
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const GestaoPage = (await import('../page')).default

    vi.mocked(redirect).mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'auth-admin' } },
          error: null,
        }),
      },
    } as never)

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        chainOperadorMaybeSingle({
          data: {
            id: 'op-admin',
            nome: 'Admin',
            perfil: 'ADMIN',
            gaep_id: 'g1',
            gaeps: { id: 'g1', codigo: 'GAEP-X', cidade: 'X', estado: 'PR' },
          },
          error: null,
        })
      ),
    } as never)

    await expect(GestaoPage({ searchParams: Promise.resolve({ tab: 'gaeps' }) })).rejects.toThrow(
      'REDIRECT:/gestao?tab=efetivo'
    )
    expect(redirect).toHaveBeenCalledWith('/gestao?tab=efetivo')
  })
})
