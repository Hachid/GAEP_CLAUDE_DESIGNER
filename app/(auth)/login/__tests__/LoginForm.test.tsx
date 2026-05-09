import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginForm } from '../LoginForm'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useActionState: vi.fn(() => [null, vi.fn(), false]),
  }
})

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: vi.fn().mockResolvedValue(undefined),
    },
  })),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o título GAEP-CAT', () => {
    render(<LoginForm />)
    expect(screen.getByText('GAEP-CAT')).toBeInTheDocument()
  })

  it('renderiza o subtítulo correto', () => {
    render(<LoginForm />)
    expect(
      screen.getByText('Gestão de Atividades e Efetivo Policial')
    ).toBeInTheDocument()
  })

  it('renderiza o campo nome de guerra', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/Nome de guerra/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex.: Silva')).toBeInTheDocument()
  })

  it('renderiza o campo matrícula (senha) com placeholder correto', () => {
    render(<LoginForm />)
    const input = screen.getByPlaceholderText('Sua matrícula')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renderiza o botão "Acessar Sistema"', () => {
    render(<LoginForm />)
    expect(
      screen.getByRole('button', { name: /Acessar Sistema/i })
    ).toBeInTheDocument()
  })

  it('botão mostra texto de loading quando isPending é true', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([null, vi.fn(), true])
    render(<LoginForm />)
    expect(screen.getByRole('button')).toHaveTextContent('⏳ Verificando...')
  })

  it('botão fica disabled quando isPending é true', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([null, vi.fn(), true])
    render(<LoginForm />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('exibe mensagem de erro quando state.error está presente', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([
      { error: 'Nome de guerra ou matrícula inválidos.' },
      vi.fn(),
      false,
    ])
    render(<LoginForm />)
    expect(
      screen.getByText('Nome de guerra ou matrícula inválidos.')
    ).toBeInTheDocument()
  })

  it('não exibe mensagem de erro no estado inicial', () => {
    render(<LoginForm />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
