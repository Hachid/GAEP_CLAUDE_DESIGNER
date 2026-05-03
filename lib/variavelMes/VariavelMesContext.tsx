'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cargaHorariaTotalHoras, cargaHorariaTotalMinutos } from './calc'

/** Snapshot do mês alinhado aos filtros (dias úteis × 7 h). */
export type VariavelDoMes = {
  referenciaMes: string
  diasUteis: number | null
  cargaHorariaTotalHoras: number | null
  cargaHorariaTotalMinutos: number | null
}

type Row = { referenciaMes: string; diasUteis: number }

type VariavelMesContextValue = {
  /** Mês (AAAA-MM) usado como referência global, alinhado aos filtros quando aplicável. */
  mesReferenciaFiltro: string
  setMesReferenciaFiltro: (referenciaMes: string) => void
  porMesDiasUteis: Record<string, number>
  mergeDiasUteisMes: (rows: Row[]) => void
  /** Atualização otimista após salvar um mês (ou merge parcial). */
  upsertDiasUteisMes: (referenciaMes: string, diasUteis: number) => void
  /** Variável do mês: dados do `mesReferenciaFiltro` no mapa. */
  variavelDoMes: VariavelDoMes
}

const VariavelMesContext = createContext<VariavelMesContextValue | null>(null)

function mesAtualPadrao(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`
}

export function VariavelMesProvider({ children }: { children: ReactNode }) {
  const [mesReferenciaFiltro, setMesReferenciaFiltroState] = useState(mesAtualPadrao)
  const [porMesDiasUteis, setPorMesDiasUteis] = useState<Record<string, number>>({})

  const setMesReferenciaFiltro = useCallback((referenciaMes: string) => {
    if (/^\d{4}-\d{2}$/.test(referenciaMes)) {
      setMesReferenciaFiltroState(referenciaMes)
    }
  }, [])

  const mergeDiasUteisMes = useCallback((rows: Row[]) => {
    setPorMesDiasUteis((prev) => {
      const next = { ...prev }
      for (const r of rows) {
        if (!/^\d{4}-\d{2}$/.test(r.referenciaMes)) continue
        next[r.referenciaMes] = Math.max(0, Math.min(31, Math.round(Number(r.diasUteis) || 0)))
      }
      return next
    })
  }, [])

  const upsertDiasUteisMes = useCallback((referenciaMes: string, diasUteis: number) => {
    if (!/^\d{4}-\d{2}$/.test(referenciaMes)) return
    const d = Math.max(0, Math.min(31, Math.round(Number(diasUteis) || 0)))
    setPorMesDiasUteis((prev) => ({ ...prev, [referenciaMes]: d }))
  }, [])

  const variavelDoMes = useMemo((): VariavelDoMes => {
    const dias = porMesDiasUteis[mesReferenciaFiltro]
    if (typeof dias !== 'number') {
      return {
        referenciaMes: mesReferenciaFiltro,
        diasUteis: null,
        cargaHorariaTotalHoras: null,
        cargaHorariaTotalMinutos: null,
      }
    }
    return {
      referenciaMes: mesReferenciaFiltro,
      diasUteis: dias,
      cargaHorariaTotalHoras: cargaHorariaTotalHoras(dias),
      cargaHorariaTotalMinutos: cargaHorariaTotalMinutos(dias),
    }
  }, [mesReferenciaFiltro, porMesDiasUteis])

  const value = useMemo(
    () =>
      ({
        mesReferenciaFiltro,
        setMesReferenciaFiltro,
        porMesDiasUteis,
        mergeDiasUteisMes,
        upsertDiasUteisMes,
        variavelDoMes,
      }) satisfies VariavelMesContextValue,
    [
      mesReferenciaFiltro,
      porMesDiasUteis,
      setMesReferenciaFiltro,
      mergeDiasUteisMes,
      upsertDiasUteisMes,
      variavelDoMes,
    ]
  )

  return <VariavelMesContext.Provider value={value}>{children}</VariavelMesContext.Provider>
}

export function useVariavelMes(): VariavelMesContextValue {
  const ctx = useContext(VariavelMesContext)
  if (!ctx) {
    throw new Error('useVariavelMes deve ser usado dentro de VariavelMesProvider')
  }
  return ctx
}

/** Apenas o snapshot do mês referência (dias úteis × 7 h), para uso nos filtros. */
export function useVariavelDoMes(): VariavelDoMes {
  return useVariavelMes().variavelDoMes
}
