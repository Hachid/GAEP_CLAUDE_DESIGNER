'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { SeletorOperador } from '@/components/operadores/SeletorOperador'
import { TabsMesPeriodo } from '@/components/operadores/TabsMesPeriodo'
import type { TabTipo } from '@/components/operadores/TabsMesPeriodo'
import { fetchDesempenhoData } from './actions'
import type { KPIData } from '@/app/(app)/dashboard/types'
import type { FolhaDia } from './types'

// Recharts usa APIs de browser — ssr:false evita mismatch de hidratação
const GraficosOperador = dynamic(
  () => import('@/components/operadores/GraficosOperador').then((m) => m.GraficosOperador),
  { ssr: false }
)
const FolhaPonto = dynamic(
  () => import('@/components/operadores/FolhaPonto').then((m) => m.FolhaPonto),
  { ssr: false }
)

type Operador = { id: string; nome: string }

type Props = {
  operadores: Operador[]
  operadorInicialId: string
}

type ViewTipo = 'bi' | 'folha' | null

function mesParaFiltros(mes: string): { dataInicio: string; dataFim: string } {
  const [ano, m] = mes.split('-').map(Number)
  const dataInicio = `${ano}-${String(m).padStart(2, '0')}-01`
  const dataFim = new Date(ano, m, 0).toISOString().slice(0, 10)
  return { dataInicio, dataFim }
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e2e8f0',
  borderLeft: '4px solid #1a237e',
}

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 8px',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#fff',
  transition: '0.2s',
}

function now() {
  return new Date()
}

export function DesempenhoClient({ operadores, operadorInicialId }: Props) {
  const today = now()
  const anoAtual = today.getFullYear()
  const mesAtual = today.getMonth() + 1
  const mesDefault = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`
  const primeiroDiaAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
  const ultimoDiaAtual = new Date(anoAtual, mesAtual, 0).toISOString().slice(0, 10)

  const [operadorId, setOperadorId] = useState(operadorInicialId)
  const [tab, setTab] = useState<TabTipo>('mes')
  const [mes, setMes] = useState(mesDefault)
  const [dataInicio, setDataInicio] = useState(primeiroDiaAtual)
  const [dataFim, setDataFim] = useState(ultimoDiaAtual)
  const [view, setView] = useState<ViewTipo>(null)
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [folha, setFolha] = useState<FolhaDia[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function getFiltros() {
    if (tab === 'mes') return mesParaFiltros(mes)
    return { dataInicio, dataFim }
  }

  function buscar(novaView: ViewTipo) {
    if (!operadorId) {
      setErro('Selecione um operador.')
      return
    }
    setErro(null)
    const filtros = getFiltros()
    startTransition(async () => {
      const result = await fetchDesempenhoData(operadorId, filtros)
      if (result.error) {
        setErro(result.error)
      } else if (result.data) {
        setKpi(result.data.kpi)
        setFolha(result.data.folha)
        setView(novaView)
      }
    })
  }

  function handleOperadorChange(id: string) {
    setOperadorId(id)
    setView(null)
    setKpi(null)
    setFolha(null)
    setErro(null)
  }

  const filtrosCorrentes = getFiltros()
  const hrefPdfFolha =
    operadorId !== ''
      ? `/api/pdf/desempenho-operador?operadorId=${encodeURIComponent(operadorId)}&dataInicio=${encodeURIComponent(filtrosCorrentes.dataInicio)}&dataFim=${encodeURIComponent(filtrosCorrentes.dataFim)}&download=1`
      : '#'

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Painel de filtros */}
      <div style={cardStyle}>
        <SeletorOperador
          operadores={operadores}
          value={operadorId}
          onChange={handleOperadorChange}
        />

        <TabsMesPeriodo
          tab={tab}
          onChange={(t) => { setTab(t); setView(null); }}
          mesSelecionado={mes}
          onMesChange={(m) => { setMes(m); setView(null); }}
          dataInicio={dataInicio}
          onDataInicioChange={(d) => { setDataInicio(d); setView(null); }}
          dataFim={dataFim}
          onDataFimChange={(d) => { setDataFim(d); setView(null); }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button
            onClick={() => buscar('bi')}
            disabled={isPending}
            style={{
              ...btnStyle,
              background: isPending && view !== 'folha' ? '#6b7280' : '#2563eb',
            }}
          >
            📊 Analisar Operador
          </button>
          <button
            onClick={() => buscar('folha')}
            disabled={isPending}
            style={{
              ...btnStyle,
              background: isPending && view !== 'bi' ? '#6b7280' : '#16a34a',
            }}
          >
            📅 Gerar Folha
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {erro}
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.88rem',
            fontWeight: 600,
            padding: '20px 0',
          }}
        >
          Carregando...
        </div>
      )}

      {/* View: BI */}
      {!isPending && view === 'bi' && kpi && (
        <div style={{ animation: 'fadeIn .3s' }}>
          <GraficosOperador kpi={kpi} />
        </div>
      )}

      {/* View: Folha Ponto */}
      {!isPending && view === 'folha' && kpi && folha && (
        <div style={{ animation: 'fadeIn .3s' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <a
              href={hrefPdfFolha}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...btnStyle,
                flex: '0 0 auto',
                padding: '12px 20px',
                background: '#0f172a',
                textDecoration: 'none',
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              📄 Gerar PDF
            </a>
          </div>
          <FolhaPonto
            dias={folha}
            totalMinutos={kpi.totalMinutos}
            totalRegistros={kpi.totalRegistros}
            cargaHorariaPrevistaMinutos={kpi.cargaHorariaPrevistaMinutos}
            saldoMinutos={kpi.saldoMinutos}
          />
        </div>
      )}
    </div>
  )
}
