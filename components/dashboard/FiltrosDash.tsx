'use client'

import { useState } from 'react'
import type { DashboardFiltros } from '@/app/(app)/dashboard/types'

type Props = {
  filtros: DashboardFiltros
  categorias: { id: string; nome: string }[]
  atividades: { id: string; nome: string }[]
  onAtualizar: (filtros: DashboardFiltros) => void
  loading: boolean
}

export function FiltrosDash({ filtros, categorias, atividades, onAtualizar, loading }: Props) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<DashboardFiltros>(filtros)

  function handleCategoriaChange(categoriaId: string) {
    setLocal((prev) => ({ ...prev, categoriaId, atividadeId: '' }))
  }

  function handleAtualizar() {
    onAtualizar(local)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 5,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    fontSize: '0.72rem',
    letterSpacing: 0.5,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#f3f4f6',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          padding: '13px 18px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontWeight: 700,
          fontSize: '0.8rem',
          color: '#1a237e',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderRadius: 12,
          outline: open ? '1px solid #1a237e' : '1px solid transparent',
        }}
      >
        <span>🔍</span> {open ? 'Ocultar Filtros' : 'Mostrar / Ocultar Filtros do Painel'}
      </button>

      {open && (
        <div
          style={{
            padding: '16px 18px 18px',
            borderTop: '1px solid #e2e8f0',
            animation: 'fadeIn .2s ease',
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
          >
            <div>
              <label style={labelStyle}>Data Início</label>
              <input
                type="date"
                style={inputStyle}
                value={local.dataInicio}
                onChange={(e) => setLocal((p) => ({ ...p, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Data Fim</label>
              <input
                type="date"
                style={inputStyle}
                value={local.dataFim}
                onChange={(e) => setLocal((p) => ({ ...p, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}
          >
            <div>
              <label style={labelStyle}>Categoria</label>
              <select
                style={inputStyle}
                value={local.categoriaId}
                onChange={(e) => handleCategoriaChange(e.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Atividade</label>
              <select
                style={inputStyle}
                value={local.atividadeId}
                onChange={(e) => setLocal((p) => ({ ...p, atividadeId: e.target.value }))}
              >
                <option value="">Todas</option>
                {atividades.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAtualizar}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#94a3b8' : '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.5,
              transition: 'background 0.2s',
            }}
          >
            {loading ? '⏳ Atualizando...' : '📊 Atualizar Painel'}
          </button>
        </div>
      )}
    </div>
  )
}
