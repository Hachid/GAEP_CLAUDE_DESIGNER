import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AreaRevisao } from '../AreaRevisao'

describe('AreaRevisao', () => {
  const defaultProps = {
    descricaoRevisada: 'Texto revisado pela IA.',
    onSalvar: vi.fn(),
    salvando: false,
  }

  it('renderiza a descrição revisada no textarea', () => {
    render(<AreaRevisao {...defaultProps} />)
    expect(screen.getByDisplayValue('Texto revisado pela IA.')).toBeInTheDocument()
  })

  it('renderiza label Texto Oficial Revisado', () => {
    render(<AreaRevisao {...defaultProps} />)
    expect(screen.getByText(/Texto Oficial Revisado/i)).toBeInTheDocument()
  })

  it('renderiza textarea de Observações', () => {
    render(<AreaRevisao {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Informações relevantes/i)).toBeInTheDocument()
  })

  it('renderiza botão Salvar & Consolidar', () => {
    render(<AreaRevisao {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Salvar.*Consolidar/i })).toBeInTheDocument()
  })

  it('chama onSalvar com descricaoFinal e ocorrencias ao clicar', () => {
    const onSalvar = vi.fn()
    render(<AreaRevisao {...defaultProps} onSalvar={onSalvar} />)
    const textarea = screen.getByPlaceholderText(/Informações relevantes/i)
    fireEvent.change(textarea, { target: { value: 'Obs: nenhuma ocorrência.' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar.*Consolidar/i }))
    expect(onSalvar).toHaveBeenCalledWith('Texto revisado pela IA.', 'Obs: nenhuma ocorrência.')
  })

  it('botão fica desabilitado quando salvando', () => {
    render(<AreaRevisao {...defaultProps} salvando />)
    expect(screen.getByRole('button', { name: /Consolidando/i })).toBeDisabled()
  })

  it('mostra texto Consolidando quando salvando', () => {
    render(<AreaRevisao {...defaultProps} salvando />)
    expect(screen.getByText(/Consolidando/i)).toBeInTheDocument()
  })
})
