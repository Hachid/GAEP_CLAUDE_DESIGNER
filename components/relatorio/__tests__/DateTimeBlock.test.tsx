import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DateTimeBlock } from '../DateTimeBlock'

const baseProps = {
  date: '2026-05-01',
  startTime: '',
  endTime: '',
  onDateChange: vi.fn(),
  onStartChange: vi.fn(),
  onEndChange: vi.fn(),
}

describe('DateTimeBlock', () => {
  it('renderiza input de data', () => {
    render(<DateTimeBlock {...baseProps} />)
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument()
  })

  it('renderiza labels DATA DO TURNO, INÍCIO e TÉRMINO', () => {
    render(<DateTimeBlock {...baseProps} />)
    expect(screen.getByText(/Data do Turno/i)).toBeInTheDocument()
    expect(screen.getByText(/Início/i)).toBeInTheDocument()
    expect(screen.getByText(/Término/i)).toBeInTheDocument()
  })

  it('chama onDateChange quando data muda', () => {
    const onDateChange = vi.fn()
    render(<DateTimeBlock {...baseProps} onDateChange={onDateChange} />)
    const dateInput = screen.getByDisplayValue('2026-05-01')
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } })
    expect(onDateChange).toHaveBeenCalledWith('2026-05-01')
  })

  it('chama onStartChange quando hora de início muda', () => {
    const onStartChange = vi.fn()
    render(<DateTimeBlock {...baseProps} onStartChange={onStartChange} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    expect(onStartChange).toHaveBeenCalledWith('08:00')
  })

  it('chama onEndChange quando hora de término muda', () => {
    const onEndChange = vi.fn()
    render(<DateTimeBlock {...baseProps} onEndChange={onEndChange} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[1], { target: { value: '12:00' } })
    expect(onEndChange).toHaveBeenCalledWith('12:00')
  })

  it('não mostra duração quando horários não preenchidos', () => {
    render(<DateTimeBlock {...baseProps} />)
    expect(screen.queryByText(/Duração/i)).not.toBeInTheDocument()
  })

  it('mostra duração calculada quando ambos os horários são preenchidos', () => {
    render(<DateTimeBlock {...baseProps} />)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    fireEvent.change(timeInputs[1], { target: { value: '12:00' } })
    expect(screen.getByText(/Duração/i)).toBeInTheDocument()
    expect(screen.getByText(/4h/i)).toBeInTheDocument()
  })
})
