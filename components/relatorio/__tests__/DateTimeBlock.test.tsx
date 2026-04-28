import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DateTimeBlock } from '../DateTimeBlock'

describe('DateTimeBlock', () => {
  it('renderiza input de data', () => {
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={vi.fn()} onEndChange={vi.fn()} />)
    expect(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('renderiza labels DATA DO TURNO, INÍCIO e TÉRMINO', () => {
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={vi.fn()} onEndChange={vi.fn()} />)
    expect(screen.getByText(/Data do Turno/i)).toBeInTheDocument()
    expect(screen.getByText(/Início/i)).toBeInTheDocument()
    expect(screen.getByText(/Término/i)).toBeInTheDocument()
  })

  it('chama onDateChange quando data muda', () => {
    const onDateChange = vi.fn()
    render(<DateTimeBlock onDateChange={onDateChange} onStartChange={vi.fn()} onEndChange={vi.fn()} />)
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } })
    expect(onDateChange).toHaveBeenCalledWith('2026-05-01')
  })

  it('chama onStartChange quando hora de início muda', () => {
    const onStartChange = vi.fn()
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={onStartChange} onEndChange={vi.fn()} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    expect(onStartChange).toHaveBeenCalledWith('08:00')
  })

  it('chama onEndChange quando hora de término muda', () => {
    const onEndChange = vi.fn()
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={vi.fn()} onEndChange={onEndChange} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[1], { target: { value: '12:00' } })
    expect(onEndChange).toHaveBeenCalledWith('12:00')
  })

  it('não mostra duração quando horários não preenchidos', () => {
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={vi.fn()} onEndChange={vi.fn()} />)
    expect(screen.queryByText(/Duração/i)).not.toBeInTheDocument()
  })

  it('mostra duração calculada quando ambos os horários são preenchidos', () => {
    render(<DateTimeBlock onDateChange={vi.fn()} onStartChange={vi.fn()} onEndChange={vi.fn()} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    fireEvent.change(timeInputs[1], { target: { value: '12:00' } })
    expect(screen.getByText(/Duração/i)).toBeInTheDocument()
    expect(screen.getByText(/4h/i)).toBeInTheDocument()
  })
})
