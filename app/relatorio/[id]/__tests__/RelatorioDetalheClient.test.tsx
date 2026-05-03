import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RelatorioDetalheClient } from '../RelatorioDetalheClient'

// ── Mocks (hoisted) ────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    target,
    rel,
  }: {
    children: React.ReactNode
    href: string
    target?: string
    rel?: string
  }) => (
    <a href={href} target={target} rel={rel}>
      {children}
    </a>
  ),
}))

vi.mock('../../actions', () => ({
  editarRelatorio: vi.fn().mockResolvedValue({}),
  excluirRelatorio: vi.fn().mockResolvedValue({}),
}))

// ── Fixtures ───────────────────────────────────────────────────

import type { RelatorioDetalhado } from '../../actions'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'

const estiloBase = {
  fontFamily: 'Times New Roman',
  fontColor: '#000000',
  align: 'center' as const,
  indent: 0,
  lineHeight: 1.4,
  fontSize: 12,
}

const mockIntegrity = {
  hash: 'A1B2C3D4E5F67890',
  qrPayload: 'GAEP-CAT|ID:rel-1|DATA:2026-04-30|HASH:A1B2C3D4E5F67890',
}

const mockConfig: ConfigRelatorioUIData = {
  id: null,
  tituloTexto: 'RELATÓRIO OPERACIONAL',
  subtituloTexto: 'MISSÃO — Patrulhamento',
  descricaoTexto: '',
  rodapeTexto: '{{GAEP}} · v{{VERSAO}}',
  timbradoUrl: null,
  tituloEstilo: estiloBase,
  subtituloEstilo: { ...estiloBase, fontSize: 11 },
  descricaoEstilo: { ...estiloBase, align: 'justify', indent: 12, lineHeight: 1.8 },
  rodapeEstilo: { ...estiloBase, fontColor: '#6b7280', align: 'right', fontSize: 8 },
  printMargins: { top: 55, right: 20, bottom: 32, left: 22 },
}

const mockRelatorio: RelatorioDetalhado = {
  id: 'rel-1',
  gaep_id: 'gaep-1',
  data: '2026-04-30',
  hora_inicio: '08:00:00',
  hora_fim: '12:00:00',
  horas_totais: 4,
  descricao_bruta: 'Texto bruto.',
  descricao_revisada: 'Texto revisado do relatório operacional.',
  ocorrencias: 'Nenhuma ocorrência registrada.',
  fotos_urls: null,
  outros_integrantes: null,
  versao: 1,
  created_at: '2026-04-30T08:00:00Z',
  updated_at: '2026-04-30T08:00:00Z',
  categoria_nome: 'MISSÃO',
  atividade_nome: 'Patrulhamento',
  relatorista_nome: 'João Silva',
  participantes: [
    { id: 'op-1', nome: 'João Silva' },
    { id: 'op-2', nome: 'Maria Santos' },
  ],
  versoes: [],
}

const defaultProps = {
  relatorio: mockRelatorio,
  perfil: 'OPERADOR',
  operadorId: 'op-1',
  gaepCodigo: 'GAEP-CAT',
  configRelatorio: mockConfig,
  integrity: mockIntegrity,
}

// ── Helpers ────────────────────────────────────────────────────

function renderDetalhe(overrides = {}) {
  return render(<RelatorioDetalheClient {...defaultProps} {...overrides} />)
}

// ── Testes: Vista de tela (no-print) ───────────────────────────
describe('RelatorioDetalheClient — vista de tela', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe iframe do PDF após clicar em Ver PDF', async () => {
    const { container } = renderDetalhe()
    expect(container.querySelector('iframe[title="Relatório em PDF"]')).toBeNull()
    const btn = screen.getByRole('button', { name: /Ver PDF/i })
    await fireEvent.click(btn)
    const iframe = container.querySelector('iframe[title="Relatório em PDF"]') as HTMLIFrameElement | null
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute('src')).toBe('/api/pdf/rel-1')
  })

  it('exibe link "Nova aba" para o mesmo PDF', () => {
    renderDetalhe()
    const link = screen.getByRole('link', { name: /Nova aba/i })
    expect(link).toHaveAttribute('href', '/api/pdf/rel-1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('exibe link Baixar PDF com query download=1', () => {
    renderDetalhe()
    const link = screen.getByRole('link', { name: /Baixar PDF/i })
    expect(link).toHaveAttribute('href', '/api/pdf/rel-1?download=1')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('oculta o iframe ao clicar em Ocultar PDF', async () => {
    const { container } = renderDetalhe()
    await fireEvent.click(screen.getByRole('button', { name: /Ver PDF/i }))
    expect(container.querySelector('iframe[title="Relatório em PDF"]')).toBeTruthy()
    const btn = screen.getByRole('button', { name: /Ocultar PDF/i })
    await fireEvent.click(btn)
    expect(container.querySelector('iframe[title="Relatório em PDF"]')).toBeNull()
  })

  it('exibe link de voltar para o histórico', () => {
    renderDetalhe()
    const link = screen.getByRole('link', { name: '←' })
    expect(link).toHaveAttribute('href', '/relatorio/historico')
  })

  it('exibe o título configurado', () => {
    renderDetalhe()
    const titulos = screen.getAllByText('RELATÓRIO OPERACIONAL')
    expect(titulos.length).toBeGreaterThan(0)
  })

  it('exibe subtítulo conforme configuração da Gestão', () => {
    renderDetalhe()
    const linhas = screen.getAllByText('MISSÃO — Patrulhamento')
    expect(linhas.length).toBeGreaterThan(0)
  })

  it('exibe a data formatada corretamente', () => {
    renderDetalhe()
    expect(screen.getAllByText(/30\/04\/2026/).length).toBeGreaterThan(0)
  })

  it('exibe o horário do turno', () => {
    renderDetalhe()
    // "08:00 às 12:00 (4h)"
    expect(screen.getAllByText(/08:00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/12:00/).length).toBeGreaterThan(0)
  })

  it('exibe os membros da equipe', () => {
    renderDetalhe()
    expect(screen.getAllByText(/João Silva/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Maria Santos/).length).toBeGreaterThan(0)
  })

  it('exibe o texto revisado do relatório', () => {
    renderDetalhe()
    expect(screen.getAllByText('Texto revisado do relatório operacional.').length).toBeGreaterThan(0)
  })

  it('exibe ocorrências quando presentes', () => {
    renderDetalhe()
    expect(screen.getAllByText('Nenhuma ocorrência registrada.').length).toBeGreaterThan(0)
  })

  it('exibe timbrado como imagem quando timbradoUrl está presente', () => {
    renderDetalhe({
      configRelatorio: { ...mockConfig, timbradoUrl: 'https://example.com/timbrado.jpg' },
    })
    const imgs = screen.getAllByRole('img')
    const timbrado = imgs.find(img => img.getAttribute('src') === 'https://example.com/timbrado.jpg')
    expect(timbrado).toBeDefined()
    expect(timbrado).toHaveAttribute('alt', 'Papel Timbrado')
  })

  it('não exibe imagem de timbrado quando timbradoUrl é null', () => {
    renderDetalhe()
    const imgs = screen.queryAllByAltText('Papel Timbrado')
    expect(imgs).toHaveLength(0)
  })

  it('exibe rodapé de validação "sistema GAEP"', () => {
    renderDetalhe()
    expect(screen.getAllByText(/sistema GAEP/i).length).toBeGreaterThan(0)
  })

  it('exibe o relatorista no rodapé de validação', () => {
    renderDetalhe()
    // "Relatorista: João Silva" na área de validação
    const relatorista = screen.getAllByText(/João Silva/)
    expect(relatorista.length).toBeGreaterThan(0)
  })

  it('não exibe botões de admin para perfil OPERADOR', () => {
    renderDetalhe({ perfil: 'OPERADOR' })
    expect(screen.queryByText('Editar Texto')).not.toBeInTheDocument()
    expect(screen.queryByText('Excluir Relatório')).not.toBeInTheDocument()
  })

  it('exibe botão "Editar Texto" para perfil ADMIN', () => {
    renderDetalhe({ perfil: 'ADMIN' })
    expect(screen.getByText('Editar Texto')).toBeInTheDocument()
  })

  it('exibe botão "Excluir Relatório" para perfil ADMIN', () => {
    renderDetalhe({ perfil: 'ADMIN' })
    expect(screen.getByText('Excluir Relatório')).toBeInTheDocument()
  })

  it('exibe confirmação ao clicar em "Excluir Relatório"', () => {
    renderDetalhe({ perfil: 'ADMIN' })
    fireEvent.click(screen.getByText('Excluir Relatório'))
    expect(screen.getByText(/Confirmar exclusão/i)).toBeInTheDocument()
  })

  it('mostra textarea de edição ao clicar em "Editar Texto"', () => {
    renderDetalhe({ perfil: 'ADMIN' })
    fireEvent.click(screen.getByText('Editar Texto'))
    expect(screen.getByText('Editar Texto do Relatório')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Texto revisado do relatório operacional.')).toBeInTheDocument()
  })

  it('exibe histórico de versões para admin quando há versões', () => {
    const relComVersoes = {
      ...mockRelatorio,
      versoes: [{
        id: 'v1', versao: 1,
        descricao_anterior: 'Texto antigo', descricao_nova: 'Texto novo',
        motivo: 'Correção', editado_por_nome: 'Admin',
        created_at: '2026-04-30T10:00:00Z',
      }],
    }
    renderDetalhe({ perfil: 'ADMIN', relatorio: relComVersoes })
    expect(screen.getByText('Histórico de Versões')).toBeInTheDocument()
  })
})

// ── Testes: Vista de impressão (print-page) ────────────────────
describe('RelatorioDetalheClient — vista de impressão', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o bloco .print-page', () => {
    const { container } = renderDetalhe()
    expect(container.querySelector('.print-page')).toBeInTheDocument()
  })

  it('print-page contém bloco de background (.print-page-bg)', () => {
    const { container } = renderDetalhe()
    expect(container.querySelector('.print-page-bg')).toBeInTheDocument()
  })

  it('print-page contém área de conteúdo (.print-page-content)', () => {
    const { container } = renderDetalhe()
    expect(container.querySelector('.print-page-content')).toBeInTheDocument()
  })

  it('print-page-bg recebe background-image quando timbradoUrl está presente', () => {
    const url = 'https://example.com/timbrado.jpg'
    const { container } = renderDetalhe({
      configRelatorio: { ...mockConfig, timbradoUrl: url },
    })
    const bg = container.querySelector('.print-page-bg') as HTMLElement
    expect(bg.style.backgroundImage).toContain(url)
  })

  it('print-page-content tem margens via inline style', () => {
    const { container } = renderDetalhe()
    const content = container.querySelector('.print-page-content') as HTMLElement
    expect(content.style.top).toBe('55mm')
    expect(content.style.left).toBe('22mm')
    expect(content.style.right).toBe('20mm')
    expect(content.style.bottom).toBe('32mm')
  })

  it('exibe cabeçalho de seção "Descrição da atividade"', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText(/Descrição da atividade/i)).toBeInTheDocument()
  })

  it('exibe cabeçalho de ocorrências quando ocorrências presentes', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText(/Ocorrências \/ observações/i)).toBeInTheDocument()
  })

  it('não exibe seção de ocorrências quando não há ocorrências', () => {
    const { container } = renderDetalhe({
      relatorio: { ...mockRelatorio, ocorrencias: null },
    })
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).queryByText(/Ocorrências \/ observações/i)).not.toBeInTheDocument()
  })

  it('tabela de metadados contém rótulo "Data"', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText('Data')).toBeInTheDocument()
  })

  it('tabela de metadados contém rótulo "Período"', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText('Período')).toBeInTheDocument()
  })

  it('tabela de metadados contém rótulo "Categoria" quando presente', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText('Categoria')).toBeInTheDocument()
  })

  it('área de impressão inclui nomes dos participantes no bloco de descrição (composição tipo PDF)', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText('João Silva, Maria Santos')).toBeInTheDocument()
  })

  it('exibe hash de autenticidade no rodapé de impressão', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText(new RegExp(mockIntegrity.hash))).toBeInTheDocument()
  })

  it('exibe rodapé de validação "sistema GAEP" na área de impressão', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText(/sistema GAEP/i)).toBeInTheDocument()
  })

  it('exibe versão do relatório no rodapé de impressão', () => {
    const { container } = renderDetalhe()
    const printPage = container.querySelector('.print-page')!
    expect(within(printPage as HTMLElement).getByText(/v1/)).toBeInTheDocument()
  })
})
