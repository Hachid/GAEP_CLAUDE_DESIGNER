'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FiltrosDash } from '@/components/dashboard/FiltrosDash'
import { KPIGrid } from '@/components/dashboard/KPIGrid'
import { refreshKPIData } from './actions'
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
  atividades: { id: string; nome: string; categoria_id: string }[]
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
}: Props) {
  const router = useRouter()
  const [kpi, setKpi] = useState<KPIData>(kpiInicial)
  const [filtros, setFiltros] = useState<DashboardFiltros>(filtrosIniciais)
  const [erroFiltro, setErroFiltro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Atualiza dados do servidor a cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  function handleAtualizar(novosFiltros: DashboardFiltros) {
    setFiltros(novosFiltros)
    setErroFiltro(null)
    startTransition(async () => {
      const result = await refreshKPIData(novosFiltros)
      if (result.error) {
        setErroFiltro(result.error)
      } else if (result.data) {
        setKpi(result.data)
      }
    })
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <FiltrosDash
        filtros={filtros}
        categorias={categorias}
        atividades={atividades}
        onAtualizar={handleAtualizar}
        loading={isPending}
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

      <KPIGrid kpi={kpi} />

      <div style={cardStyle}>
        <div style={cardTitleStyle}>Composição por Categoria</div>
        <DonutCategoria data={kpi.porCategoria} />
      </div>

      <div style={cardStyle}>
        <RankingBars data={kpi.rankingAtividades} />
      </div>

      <EvolucaoLinhas evolucao={evolucaoInicial} />
    </div>
  )
}
