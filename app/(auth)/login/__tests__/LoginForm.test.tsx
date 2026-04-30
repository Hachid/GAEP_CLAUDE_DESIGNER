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

const mockOperadores = [
  { id: '1', nome: 'Ana Souza', matricula: '001' },
  { id: '2', nome: 'Bruno Lima', matricula: '002' },
]

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o título GAEP-CAT', () => {
    render(<LoginForm operadores={mockOperadores} />)
    expect(screen.getByText('GAEP-CAT')).toBeInTheDocument()
  })

  it('renderiza o subtítulo correto', () => {
    render(<LoginForm operadores={mockOperadores} />)
    expect(
      screen.getByText('Gestão de Atividades e Efetivo Policial')
    ).toBeInTheDocument()
  })

  it('renderiza o select com todos os operadores', () => {
    render(<LoginForm operadores={mockOperadores} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
  })

  it('renderiza o input de senha com placeholder correto', () => {
    render(<LoginForm operadores={mockOperadores} />)
    const input = screen.getByPlaceholderText('Digite sua senha')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renderiza o botão "Acessar Sistema"', () => {
    render(<LoginForm operadores={mockOperadores} />)
    expect(
      screen.getByRole('button', { name: /Acessar Sistema/i })
    ).toBeInTheDocument()
  })

  it('botão mostra texto de loading quando isPending é true', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([null, vi.fn(), true])
    render(<LoginForm operadores={mockOperadores} />)
    expect(screen.getByRole('button')).toHaveTextContent('⏳ Verificando...')
  })

  it('botão fica disabled quando isPending é true', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([null, vi.fn(), true])
    render(<LoginForm operadores={mockOperadores} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('exibe mensagem de erro quando state.error está presente', async () => {
    const { useActionState } = await import('react')
    vi.mocked(useActionState).mockReturnValueOnce([
      { error: 'Matrícula ou senha inválida.' },
      vi.fn(),
      false,
    ])
    render(<LoginForm operadores={mockOperadores} />)
    expect(screen.getByText('Matrícula ou senha inválida.')).toBeInTheDocument()
  })

  it('não exibe mensagem de erro no estado inicial', () => {
    render(<LoginForm operadores={mockOperadores} />)
    expect(
      screen.queryByRole('alert')
    ).not.toBeInTheDocument()
  })
})
