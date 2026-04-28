import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BotoesAcao } from '../BotoesAcao'

describe('BotoesAcao', () => {
  const defaultProps = {
    onSalvarDireto: vi.fn(),
    onRedigirIA: vi.fn(),
    iaLoading: false,
    salvando: false,
  }

  it('renderiza botão Salvar Direto', () => {
    render(<BotoesAcao {...defaultProps} />)
    expect(screen.getByText(/Salvar Direto/i)).toBeInTheDocument()
  })

  it('renderiza botão Redigir com IA', () => {
    render(<BotoesAcao {...defaultProps} />)
    expect(screen.getByText(/Redigir com IA/i)).toBeInTheDocument()
  })

  it('chama onSalvarDireto ao clicar', () => {
    const onSalvarDireto = vi.fn()
    render(<BotoesAcao {...defaultProps} onSalvarDireto={onSalvarDireto} />)
    fireEvent.click(screen.getByText(/Salvar Direto/i))
    expect(onSalvarDireto).toHaveBeenCalledTimes(1)
  })

  it('chama onRedigirIA ao clicar', () => {
    const onRedigirIA = vi.fn()
    render(<BotoesAcao {...defaultProps} onRedigirIA={onRedigirIA} />)
    fireEvent.click(screen.getByText(/Redigir com IA/i))
    expect(onRedigirIA).toHaveBeenCalledTimes(1)
  })

  it('botões ficam desabilitados quando iaLoading', () => {
    render(<BotoesAcao {...defaultProps} iaLoading />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('botões ficam desabilitados quando salvando', () => {
    render(<BotoesAcao {...defaultProps} salvando />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('mostra texto Redigindo quando iaLoading', () => {
    render(<BotoesAcao {...defaultProps} iaLoading />)
    expect(screen.getByText(/Redigindo/i)).toBeInTheDocument()
  })

  it('mostra texto Salvando quando salvando', () => {
    render(<BotoesAcao {...defaultProps} salvando />)
    expect(screen.getByText(/Salvando/i)).toBeInTheDocument()
  })
})
