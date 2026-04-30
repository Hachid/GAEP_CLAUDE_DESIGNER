'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { RelatorioResumo } from '../actions'
import { excluirRelatorio } from '../actions'

interface Categoria { id: string; nome: string }
interface Atividade { id: string; nome: string }
interface Operador { id: string; nome: string }

interface Props {
  relatorios: RelatorioResumo[]
  categorias: Categoria[]
  atividades: Atividade[]
  operadores: Operador[]
  perfil: string
  operadorId: string
}

const CAT_COLORS: Record<string, string> = {
  OPERAR: '#1a237e',
  TREINAR: '#f97316',
  INSTRUIR: '#16a34a',
}

function fmt(iso: string) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function today() { return new Date().toISOString().split('T')[0] }
function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d',   label: '7 dias' },
  { id: '30d',  label: '30 dias' },
  { id: 'mes',  label: 'Este mês' },
  { id: 'ano',  label: 'Este ano' },
] as const

type PeriodoId = typeof PERIODOS[number]['id'] | ''

export function HistoricoClient({ relatorios, categorias, atividades, operadores, perfil, operadorId }: Props) {
  const router = useRouter()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)

  // Filtros
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoId>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [atividadeId, setAtividadeId] = useState('')
  const [operadorFiltroId, setOperadorFiltroId] = useState('')
  const [expandido, setExpandido] = useState(false)

  // Exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function aplicarPeriodo(pid: PeriodoId) {
    setPeriodo(pid)
    const d = new Date()
    const fmt2 = (x: Date) => x.toISOString().split('T')[0]
    if (pid === 'hoje') { setDataInicio(today()); setDataFim(today()) }
    else if (pid === '7d') { setDataInicio(addDays(-6)); setDataFim(today()) }
    else if (pid === '30d') { setDataInicio(addDays(-29)); setDataFim(today()) }
    else if (pid === 'mes') {
      setDataInicio(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`)
      setDataFim(fmt2(new Date(d.getFullYear(), d.getMonth()+1, 0)))
    }
    else if (pid === 'ano') { setDataInicio(`${d.getFullYear()}-01-01`); setDataFim(`${d.getFullYear()}-12-31`) }
    else { setDataInicio(''); setDataFim('') }
  }

  function limparTudo() {
    setBusca(''); setPeriodo(''); setDataInicio(''); setDataFim('')
    setCategoriaId(''); setAtividadeId(''); setOperadorFiltroId('')
  }

  const filtrosAtivos = [busca, categoriaId, atividadeId, operadorFiltroId, dataInicio || dataFim ? '1' : ''].filter(Boolean).length

  const listaFiltrada = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return relatorios.filter((r) => {
      if (dataInicio && r.data < dataInicio) return false
      if (dataFim && r.data > dataFim) return false
      if (categoriaId && r.categoria_id !== categoriaId) return false
      if (atividadeId && r.atividade_id !== atividadeId) return false
      if (operadorFiltroId && r.relatorista_id !== operadorFiltroId) return false
      if (q) {
        const hay = [r.categoria_nome, r.atividade_nome, r.relatorista_nome].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [relatorios, dataInicio, dataFim, categoriaId, atividadeId, operadorFiltroId, busca])

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    setErro(null)
    const result = await excluirRelatorio({ id, operadorId })
    setExcluindoId(null)
    if (result.error) { setErro(result.error) }
    else { setConfirmId(null); router.refresh() }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: '#f8fafc',
    border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: 10,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', marginBottom: 5, fontWeight: 700,
    textTransform: 'uppercase', color: '#64748b', fontSize: '0.68rem', letterSpacing: 0.5,
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/relatorio" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.2rem', lineHeight: 1 }}>←</Link>
        <h1 style={{ flex: 1, fontSize: '1.05rem', fontWeight: 800, color: '#1a237e', margin: 0 }}>
          Histórico de Relatórios
        </h1>
      </div>

      {erro && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {/* Busca rápida */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.95rem', pointerEvents: 'none' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar por categoria, atividade ou operador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ ...inp, paddingLeft: 36, borderRadius: 12 }}
        />
        {busca && (
          <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: 4 }}>✕</button>
        )}
      </div>

      {/* Chips de período */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => aplicarPeriodo(periodo === p.id ? '' : p.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${periodo === p.id ? '#1a237e' : '#e2e8f0'}`,
              background: periodo === p.id ? '#1a237e' : '#fff',
              color: periodo === p.id ? '#fff' : '#475569',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all .15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bloco de filtros avançados */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 14, overflow: 'hidden' }}>
        {/* Toggle */}
        <button
          onClick={() => setExpandido((v) => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
            Filtros avançados
            {filtrosAtivos > 0 && (
              <span style={{ marginLeft: 8, background: '#1a237e', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem' }}>
                {filtrosAtivos}
              </span>
            )}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
        </button>

        {expandido && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9' }}>
            {/* Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 12 }}>
              <div>
                <label style={lbl}>De</label>
                <input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPeriodo('') }} style={inp} />
              </div>
              <div>
                <label style={lbl}>Até</label>
                <input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPeriodo('') }} style={inp} />
              </div>
            </div>

            {/* Categoria + Atividade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Categoria</label>
                <select value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value); setAtividadeId('') }} style={inp}>
                  <option value="">Todas</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Atividade</label>
                <select value={atividadeId} onChange={(e) => setAtividadeId(e.target.value)} style={inp}>
                  <option value="">Todas</option>
                  {atividades.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Operador */}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Operador / Relatorista</label>
              <select value={operadorFiltroId} onChange={(e) => setOperadorFiltroId(e.target.value)} style={inp}>
                <option value="">Todos</option>
                {operadores.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>

            {filtrosAtivos > 0 && (
              <button onClick={limparTudo} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                ✕ Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contador */}
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10, fontWeight: 600, paddingLeft: 2 }}>
        {listaFiltrada.length} relatório{listaFiltrada.length !== 1 ? 's' : ''} encontrado{listaFiltrada.length !== 1 ? 's' : ''}
      </div>

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontWeight: 600, background: '#fff', borderRadius: 14 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
          Nenhum relatório encontrado.
          {filtrosAtivos > 0 && (
            <button onClick={limparTudo} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#1a237e', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listaFiltrada.map((r) => {
            const catColor = r.categoria_nome ? (CAT_COLORS[r.categoria_nome] ?? '#64748b') : '#94a3b8'
            return (
              <div
                key={r.id}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  borderLeft: `4px solid ${catColor}`,
                }}
              >
                <div style={{ padding: '13px 14px' }}>
                  {/* Linha 1: data + categoria + Ver */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{fmt(r.data)}</span>
                      {r.categoria_nome && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}35`,
                          textTransform: 'uppercase', letterSpacing: 0.3,
                        }}>
                          {r.categoria_nome}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/relatorio/${r.id}`}
                      style={{ flexShrink: 0, padding: '6px 14px', background: 'rgba(26,35,126,0.07)', color: '#1a237e', borderRadius: 8, fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      Ver →
                    </Link>
                  </div>

                  {/* Linha 2: atividade */}
                  {r.atividade_nome && (
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', marginBottom: 5 }}>
                      {r.atividade_nome}
                    </div>
                  )}

                  {/* Linha 3: horário + horas + versão + operador */}
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                    {r.hora_inicio && r.hora_fim && (
                      <span>{r.hora_inicio.slice(0,5)} às {r.hora_fim.slice(0,5)}</span>
                    )}
                    {r.horas_totais ? <span>· {r.horas_totais}h</span> : null}
                    {r.versao > 1 && <span>· v{r.versao}</span>}
                    {r.relatorista_nome && <span>· {r.relatorista_nome}</span>}
                  </div>

                  {/* Exclusão (admin) */}
                  {isAdmin && (
                    <div style={{ marginTop: 10 }}>
                      {confirmId === r.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, flex: 1 }}>Confirmar exclusão?</span>
                          <button
                            onClick={() => handleExcluir(r.id)}
                            disabled={excluindoId === r.id}
                            style={{ padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            {excluindoId === r.id ? '...' : 'Excluir'}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={{ padding: '5px 12px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 7, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
