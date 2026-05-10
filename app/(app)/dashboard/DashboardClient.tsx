'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useVariavelMes } from '@/lib/variavelMes'
import dynamic from 'next/dynamic'
import { FiltrosDash } from '@/components/dashboard/FiltrosDash'
import { KPIGrid } from '@/components/dashboard/KPIGrid'
import { refreshKPIData, refreshEvolucaoDashboard } from './actions'
import type { KPIData, DashboardFiltros, EvolucaoMes } from './types'

// Recharts usa APIs de browser — ssr:false sem loading evita mismatch de hidratação
const DonutCategoria = dynamic(
  () => import('@/components/dashboard/DonutCategoria').then((m) => m.DonutCategoria),
  { ssr: false }
)
const RankingBars = dynamic(
  () => import('@/components/dashboard/RankingBars').then((m) => m.RankingBars),
  { ssr: false }
)
const EvolucaoLinhas = dynamic(
  () => import('@/components/dashboard/EvolucaoLinhas').then((m) => m.EvolucaoLinhas),
  { ssr: false }
)

type Props = {
  kpiInicial: KPIData
  evolucaoInicial: EvolucaoMes[]
  filtrosIniciais: DashboardFiltros
  categorias: { id: string; nome: string }[]
  atividades: { id: string; nome: string }[]
  /** Sincroniza dias úteis no contexto global (variável do mês). */
  diasUteisMesInicial?: { referenciaMes: string; diasUteis: number }[]
  isSuperAdmin?: boolean
  listaGaepsAnalise?: { id: string; codigo: string }[]
  gaepCodigoContexto?: string
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e2e8f0',
}

const cardTitleStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 700,
  color: '#1e293b',
  fontSize: '0.95rem',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 10,
  marginBottom: 14,
}

export function DashboardClient({
  kpiInicial,
  evolucaoInicial,
  filtrosIniciais,
  categorias,
  atividades,
  diasUteisMesInicial = [],
  isSuperAdmin = false,
  listaGaepsAnalise = [],
  gaepCodigoContexto = '',
}: Props) {
  const [kpi, setKpi] = useState<KPIData>(kpiInicial)
  const [evolucao, setEvolucao] = useState<EvolucaoMes[]>(evolucaoInicial)
  const [filtros, setFiltros] = useState<DashboardFiltros>(filtrosIniciais)
  const [erroFiltro, setErroFiltro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { mergeDiasUteisMes, setMesReferenciaFiltro } = useVariavelMes()

  useEffect(() => {
    if (diasUteisMesInicial.length > 0) mergeDiasUteisMes(diasUteisMesInicial)
  }, [diasUteisMesInicial, mergeDiasUteisMes])

  useEffect(() => {
    const mi = filtros.dataInicio.slice(0, 7)
    const mf = filtros.dataFim.slice(0, 7)
    if (mi === mf) setMesReferenciaFiltro(mi)
  }, [filtros.dataInicio, filtros.dataFim, setMesReferenciaFiltro])

  function handleAtualizar(novosFiltros: DashboardFiltros) {
    setFiltros(novosFiltros)
    setErroFiltro(null)
    startTransition(async () => {
      const [result, evoRes] = await Promise.all([
        refreshKPIData(novosFiltros),
        refreshEvolucaoDashboard(novosFiltros),
      ])
      if (result.error) {
        setErroFiltro(result.error)
      } else if (result.data) {
        setKpi(result.data)
      }
      if (evoRes.error) {
        setErroFiltro((prev) => prev ?? evoRes.error)
      } else if (evoRes.data) {
        setEvolucao(evoRes.data)
      }
    })
  }

  const abrirConsolidadoPdf = useCallback(() => {
    const p = new URLSearchParams()
    p.set('dataInicio', filtros.dataInicio)
    p.set('dataFim', filtros.dataFim)
    if (filtros.categoriaId) p.set('categoriaId', filtros.categoriaId)
    if (filtros.atividadeId) p.set('atividadeId', filtros.atividadeId)
    if (filtros.analiseGaepId) p.set('analiseGaepId', filtros.analiseGaepId)
    window.open(`/api/pdf/consolidado?${p.toString()}`, '_blank', 'noopener,noreferrer')
  }, [filtros])

  return (
    <div style={{ paddingBottom: 30 }}>
      <FiltrosDash
        filtros={filtros}
        categorias={categorias}
        atividades={atividades}
        onAtualizar={handleAtualizar}
        loading={isPending}
        isSuperAdmin={isSuperAdmin}
        listaGaepsAnalise={listaGaepsAnalise}
        gaepCodigoContexto={gaepCodigoContexto}
      />

      {erroFiltro && (
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
          {erroFiltro}
        </div>
      )}

      <button
        type="button"
        onClick={abrirConsolidadoPdf}
        style={{
          width: '100%',
          marginBottom: 18,
          padding: '14px 16px',
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: '0.88rem',
          letterSpacing: 0.4,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(15,23,42,0.18)',
          minHeight: 44,
        }}
      >
        Gerar consolidado PDF
      </button>

      <KPIGrid kpi={kpi} />

      <div style={cardStyle}>
        <div style={cardTitleStyle}>Composição por Categoria</div>
        <DonutCategoria data={kpi.porCategoria} dashboardLayout />
      </div>

      <div style={cardStyle}>
        <RankingBars data={kpi.rankingAtividades} />
      </div>

      <EvolucaoLinhas evolucao={evolucao} />
    </div>
  )
}
