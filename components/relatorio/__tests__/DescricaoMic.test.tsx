import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DescricaoMic } from '../DescricaoMic'

describe('DescricaoMic', () => {
  class MockSpeechRecognition {
    lang = 'pt-BR'
    interimResults = false
    continuous = false
    onresult = null
    onend = null
    onerror = null
    start() {}
    stop() {}
  }

  if (typeof window !== 'undefined') {
    ;(window as Window & { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition
  }

  it('renderiza textarea com placeholder', () => {
    render(<DescricaoMic value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Descreva a atividade/i)).toBeInTheDocument()
  })

  it('renderiza label DESCRIÇÃO DOS FATOS', () => {
    render(<DescricaoMic value="" onChange={vi.fn()} />)
    expect(screen.getByText(/DESCRIÇÃO DOS FATOS/i)).toBeInTheDocument()
  })

  it('exibe o value no textarea', () => {
    render(<DescricaoMic value="Texto de teste" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Texto de teste')).toBeInTheDocument()
  })

  it('chama onChange ao digitar no textarea', () => {
    const onChange = vi.fn()
    render(<DescricaoMic value="" onChange={onChange} />)
    const textarea = screen.getByPlaceholderText(/Descreva a atividade/i)
    fireEvent.change(textarea, { target: { value: 'Novo texto' } })
    expect(onChange).toHaveBeenCalledWith('Novo texto')
  })

  it('renderiza botão do microfone', () => {
    render(<DescricaoMic value="" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /gravação/i })).toBeInTheDocument()
  })

  it('botão mic tem aria-label de iniciar gravação', () => {
    render(<DescricaoMic value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Iniciar gravação por voz/i)).toBeInTheDocument()
  })
})
