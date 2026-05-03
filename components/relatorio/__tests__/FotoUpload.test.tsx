import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FotoUpload } from '../FotoUpload'

vi.mock('@/app/relatorio/actions', () => ({
  uploadRelatorioFoto: vi.fn().mockResolvedValue({ url: 'https://example.com/storage/v1/object/public/gaep-fotos/x/fotos/1.jpg' }),
}))

describe('FotoUpload', () => {
  const defaultProps = {
    gaepCodigo: 'GAEP-CAT',
    categoria: 'OPERAR',
    atividade: 'POJ',
    data: '2026-04-28',
    onUpload: vi.fn(),
  }

  it('renderiza área de upload', () => {
    render(<FotoUpload {...defaultProps} />)
    expect(screen.getByText(/Toque para Câmera/i)).toBeInTheDocument()
  })

  it('renderiza label FOTOS', () => {
    render(<FotoUpload {...defaultProps} />)
    expect(screen.getByText('FOTOS')).toBeInTheDocument()
  })

  it('renderiza input file oculto', () => {
    render(<FotoUpload {...defaultProps} />)
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveStyle({ display: 'none' })
  })

  it('input aceita apenas imagens', () => {
    render(<FotoUpload {...defaultProps} />)
    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', 'image/*')
  })
})
