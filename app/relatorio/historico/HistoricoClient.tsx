'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { RelatorioResumo } from '../actions'
import { excluirRelatorio } from '../actions'

interface Categoria {
  id: string
  nome: string
}

interface Atividade {
  id: string
  nome: string
  categoria_id: string
}

interface Props {
  relatorios: RelatorioResumo[]
  categorias: Categoria[]
  atividades: Atividade[]
  perfil: string
  operadorId: string
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function nomeTitulo(r: RelatorioResumo): string {
  const data = formatarData(r.data)
  const cat = r.categoria_nome ?? ''
  const atv = r.atividade_nome ?? ''
  return `${data}${cat ? ' · ' + cat : ''}${atv ? ' - ' + atv : ''}`
}

export function HistoricoClient({ relatorios, categorias, atividades, perfil, operadorId }: Props) {
  const router = useRouter()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [atividadeId, setAtividadeId] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const atividadesFiltradas = useMemo(
    () => (categoriaId ? atividades.filter((a) => a.categoria_id === categoriaId) : atividades),
    [atividades, categoriaId]
  )

  const listaFiltrada = useMemo(() => {
    return relatorios.filter((r) => {
      if (dataInicio && r.data < dataInicio) return false
      if (dataFim && r.data > dataFim) return false
      if (categoriaId && r.categoria_id !== categoriaId) return false
      if (atividadeId && r.atividade_id !== atividadeId) return false
      return true
    })
  }, [relatorios, dataInicio, dataFim, categoriaId, atividadeId])

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    setErro(null)
    const result = await excluirRelatorio({ id, operadorId })
    setExcluindoId(null)
    if (result.error) {
      setErro(result.error)
    } else {
      setConfirmId(null)
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#f3f4f6',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 5,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    fontSize: '0.7rem',
    letterSpacing: 0.5,
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Link href="/relatorio" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.1rem' }}>
          ←
        </Link>
        <h1 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 800, color: '#1a237e', margin: 0 }}>
          Histórico de Relatórios
        </h1>
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select
              value={categoriaId}
              onChange={(e) => { setCategoriaId(e.target.value); setAtividadeId('') }}
              style={inputStyle}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Atividade</label>
            <select
              value={atividadeId}
              onChange={(e) => setAtividadeId(e.target.value)}
              style={inputStyle}
              disabled={atividadesFiltradas.length === 0}
            >
              <option value="">Todas</option>
              {atividadesFiltradas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {(dataInicio || dataFim || categoriaId || atividadeId) && (
          <button
            onClick={() => { setDataInicio(''); setDataFim(''); setCategoriaId(''); setAtividadeId('') }}
            style={{ marginTop: 10, background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Contador */}
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10, fontWeight: 600 }}>
        {listaFiltrada.length} relatório{listaFiltrada.length !== 1 ? 's' : ''}
      </div>

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontWeight: 600 }}>
          Nenhum relatório encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listaFiltrada.map((r) => (
            <div
              key={r.id}
              style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1a237e', fontSize: '0.9rem', marginBottom: 4 }}>
                    {nomeTitulo(r)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {r.hora_inicio?.slice(0, 5)} às {r.hora_fim?.slice(0, 5)}
                    {r.horas_totais ? ` · ${r.horas_totais}h` : ''}
                    {r.versao > 1 ? ` · v${r.versao}` : ''}
                  </div>
                </div>
                <Link
                  href={`/relatorio/${r.id}`}
                  style={{ flexShrink: 0, padding: '7px 14px', background: 'rgba(26,35,126,0.08)', color: '#1a237e', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Ver
                </Link>
              </div>

              {/* Confirm delete inline */}
              {isAdmin && (
                <div style={{ marginTop: 10 }}>
                  {confirmId === r.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, flex: 1 }}>Confirmar exclusão?</span>
                      <button
                        onClick={() => handleExcluir(r.id)}
                        disabled={excluindoId === r.id}
                        style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        {excluindoId === r.id ? '...' : 'Excluir'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        style={{ padding: '6px 14px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(r.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
