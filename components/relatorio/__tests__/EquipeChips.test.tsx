import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EquipeChips } from '../EquipeChips'

const operadores = [
  { id: '1', nome: 'Hachid' },
  { id: '2', nome: 'Alex' },
  { id: '3', nome: 'Botta' },
]

describe('EquipeChips', () => {
  it('renderiza chip TODOS', () => {
    render(<EquipeChips operadores={operadores} value={['1', '2', '3']} onChange={vi.fn()} />)
    expect(screen.getByText(/TODOS/i)).toBeInTheDocument()
  })

  it('renderiza todos os operadores', () => {
    render(<EquipeChips operadores={operadores} value={[]} onChange={vi.fn()} />)
    expect(screen.getByText('Hachid')).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Botta')).toBeInTheDocument()
  })

  it('chip TODOS fica ativo quando todos estão selecionados', () => {
    render(<EquipeChips operadores={operadores} value={['1', '2', '3']} onChange={vi.fn()} />)
    const todosBtn = screen.getByText(/TODOS/i)
    expect(todosBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('chip TODOS fica inativo quando nenhum está selecionado', () => {
    render(<EquipeChips operadores={operadores} value={[]} onChange={vi.fn()} />)
    const todosBtn = screen.getByText(/TODOS/i)
    expect(todosBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicar em TODOS quando todos ativos chama onChange com array vazio', () => {
    const onChange = vi.fn()
    render(<EquipeChips operadores={operadores} value={['1', '2', '3']} onChange={onChange} />)
    fireEvent.click(screen.getByText(/TODOS/i))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('clicar em TODOS quando inativos chama onChange com todos os IDs', () => {
    const onChange = vi.fn()
    render(<EquipeChips operadores={operadores} value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByText(/TODOS/i))
    expect(onChange).toHaveBeenCalledWith(['1', '2', '3'])
  })

  it('clicar em um membro o remove quando estava ativo', () => {
    const onChange = vi.fn()
    render(<EquipeChips operadores={operadores} value={['1', '2', '3']} onChange={onChange} />)
    fireEvent.click(screen.getByText('Alex'))
    expect(onChange).toHaveBeenCalledWith(['1', '3'])
  })

  it('clicar em um membro o adiciona quando estava inativo', () => {
    const onChange = vi.fn()
    render(<EquipeChips operadores={operadores} value={['1']} onChange={onChange} />)
    fireEvent.click(screen.getByText('Alex'))
    expect(onChange).toHaveBeenCalledWith(['1', '2'])
  })

  it('exibe o contador com o número de selecionados', () => {
    render(<EquipeChips operadores={operadores} value={['1', '2']} onChange={vi.fn()} />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })
})
