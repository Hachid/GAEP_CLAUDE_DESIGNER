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

  it('redireciona para /relatorio quando o perfil não é ADMIN nem SUPER_ADMIN', async () => {
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
      'REDIRECT:/relatorio'
    )
    expect(redirect).toHaveBeenCalledWith('/relatorio')
  })
})
