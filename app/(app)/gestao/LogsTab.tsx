'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  fetchAuditLogs,
  fetchGaepsParaFiltro,
  fetchTabelasDistintas,
  type AuditLogEntry,
} from './logsActions'

// ── Helpers de formatação ─────────────────────────────────────

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const ACAO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  ACESSO:  { label: 'Acesso',   bg: '#f1f5f9', color: '#475569' },
  CREATE:  { label: 'Criação',  bg: '#dcfce7', color: '#166534' },
  UPDATE:  { label: 'Edição',   bg: '#dbeafe', color: '#1e40af' },
  DELETE:  { label: 'Exclusão', bg: '#fee2e2', color: '#991b1b' },
  LOGIN:   { label: 'Login',    bg: '#fef9c3', color: '#92400e' },
}

const TABELA_LABELS: Record<string, string> = {
  operadores:        'Operador',
  atividades:        'Atividade',
  feriados:          'Feriado',
  config_ia:         'Config IA',
  config_relatorio:  'Config Relatório',
  gaeps:             'GAEP',
  gestao:            'Gestão (acesso)',
  relatorios:        'Relatório',
  missoes:           'Missão',
}

function AcaoBadge({ acao }: { acao: string }) {
  const style = ACAO_LABELS[acao] ?? { label: acao, bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
      borderRadius: 20, background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  )
}

function Detalhes({ entry }: { entry: AuditLogEntry }) {
  const dados = entry.acao === 'DELETE' ? entry.dados_antes : entry.dados_depois
  if (!dados) return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>

  const parts = Object.entries(dados)
    .filter(([k]) => !['gaep_id', 'operador_id', 'id'].includes(k))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v ?? '').slice(0, 40)}`)
    .join('  ·  ')

  return (
    <span style={{ fontSize: '0.72rem', color: '#475569', wordBreak: 'break-all' }}>
      {parts || '—'}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────

const EMPTY_FILTERS = {
  gaepId: '',
  acao: '',
  tabela: '',
  dataInicio: '',
  dataFim: '',
}

export function LogsTab() {
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS)
  const [errorMsg, setErrorMsg] = useState('')
  const [gaepsList, setGaepsList] = useState<{ id: string; codigo: string }[]>([])
  const [tabelasList, setTabelasList] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Carrega metadados para os filtros uma vez
  useEffect(() => {
    fetchGaepsParaFiltro().then(setGaepsList)
    fetchTabelasDistintas().then(setTabelasList)
  }, [])

  const carregarLogs = useCallback((p: number, f: typeof EMPTY_FILTERS) => {
    startTransition(async () => {
      setErrorMsg('')
      const result = await fetchAuditLogs({
        page: p,
        gaepId: f.gaepId || undefined,
        acao: f.acao || undefined,
        tabela: f.tabela || undefined,
        dataInicio: f.dataInicio || undefined,
        dataFim: f.dataFim || undefined,
      })
      if (result.error) {
        setErrorMsg(result.error)
        return
      }
      if (p === 0) {
        setRows(result.rows)
      } else {
        setRows((prev) => [...prev, ...result.rows])
      }
      setTotal(result.total)
      setPage(p)
    })
  }, [])

  // Carrega na primeira montagem
  useEffect(() => {
    carregarLogs(0, activeFilters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function aplicarFiltros() {
    setActiveFilters(filters)
    carregarLogs(0, filters)
  }

  function limparFiltros() {
    setFilters(EMPTY_FILTERS)
    setActiveFilters(EMPTY_FILTERS)
    carregarLogs(0, EMPTY_FILTERS)
  }

  function carregarMais() {
    carregarLogs(page + 1, activeFilters)
  }

  const temMais = rows.length < total

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Título e contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#7c3aed' }}>📋 Logs de Acesso e Edições</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
            {total > 0 ? `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}` : 'Nenhum registro'}
          </div>
        </div>
        <button
          onClick={() => carregarLogs(0, activeFilters)}
          disabled={isPending}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#475569', fontSize: '0.8rem',
            fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isPending ? '⏳' : '↺'} Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Filtros
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
          {/* GAEP */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>GAEP</label>
            <select
              value={filters.gaepId}
              onChange={(e) => setFilters((f) => ({ ...f, gaepId: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontFamily: 'inherit' }}
            >
              <option value="">Todos</option>
              {gaepsList.map((g) => (
                <option key={g.id} value={g.id}>{g.codigo}</option>
              ))}
            </select>
          </div>

          {/* Ação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Tipo de ação</label>
            <select
              value={filters.acao}
              onChange={(e) => setFilters((f) => ({ ...f, acao: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontFamily: 'inherit' }}
            >
              <option value="">Todas</option>
              <option value="ACESSO">Acesso</option>
              <option value="CREATE">Criação</option>
              <option value="UPDATE">Edição</option>
              <option value="DELETE">Exclusão</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>

          {/* Recurso */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Recurso</label>
            <select
              value={filters.tabela}
              onChange={(e) => setFilters((f) => ({ ...f, tabela: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontFamily: 'inherit' }}
            >
              <option value="">Todos</option>
              {tabelasList.map((t) => (
                <option key={t} value={t}>{TABELA_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>

          {/* Data início */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>De</label>
            <input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontFamily: 'inherit' }}
            />
          </div>

          {/* Data fim */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Até</label>
            <input
              type="date"
              value={filters.dataFim}
              onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', background: '#fff', color: '#1e293b', fontFamily: 'inherit' }}
            />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button
              onClick={aplicarFiltros}
              disabled={isPending}
              style={{
                flex: 1, padding: '8px 12px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 7, fontSize: '0.82rem', fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Aplicar
            </button>
            <button
              onClick={limparFiltros}
              disabled={isPending}
              style={{
                flex: 1, padding: '8px 12px', background: 'transparent', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem',
                fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: '0.85rem' }}>
          ❌ {errorMsg}
        </div>
      )}

      {/* Loading */}
      {isPending && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          Carregando logs...
        </div>
      )}

      {/* Sem resultados */}
      {!isPending && rows.length === 0 && !errorMsg && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
          Nenhum log encontrado para os filtros selecionados.
        </div>
      )}

      {/* Lista de logs */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <div
                key={entry.id}
                style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  borderLeft: `3px solid ${ACAO_LABELS[entry.acao]?.color ?? '#94a3b8'}`,
                }}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                {/* Linha principal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', minWidth: 90 }}>
                    {fmtDateTime(entry.created_at)}
                  </span>
                  <AcaoBadge acao={entry.acao} />
                  {entry.gaep_codigo && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', whiteSpace: 'nowrap' }}>
                      {entry.gaep_codigo}
                    </span>
                  )}
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', flex: 1 }}>
                    {entry.operador_nome ?? 'Desconhecido'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {entry.tabela ? (TABELA_LABELS[entry.tabela] ?? entry.tabela) : '—'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{isExpanded ? '▾' : '▸'}</span>
                </div>

                {/* Detalhe resumido (sempre visível) */}
                <div style={{ marginTop: 5, paddingLeft: 2 }}>
                  <Detalhes entry={entry} />
                </div>

                {/* Expansão: todos os dados */}
                {isExpanded && (
                  <div
                    style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.75rem' }}>
                      <DataBlock label="ID do registro" value={entry.registro_id} />
                      <DataBlock label="ID do operador" value={entry.operador_id} />
                      <DataBlock label="ID do GAEP" value={entry.gaep_id} />
                      <DataBlock label="IP" value={entry.ip} />
                    </div>
                    {entry.dados_antes && (
                      <JsonBlock label="Antes" dados={entry.dados_antes} />
                    )}
                    {entry.dados_depois && (
                      <JsonBlock label="Depois" dados={entry.dados_depois} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Carregar mais */}
      {temMais && (
        <button
          onClick={carregarMais}
          disabled={isPending}
          style={{
            width: '100%', marginTop: 14, padding: '11px 0',
            background: 'transparent', border: '1px solid #e2e8f0',
            borderRadius: 10, color: '#64748b', fontSize: '0.85rem',
            fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isPending ? 'Carregando...' : `Carregar mais (${total - rows.length} restantes)`}
        </button>
      )}
    </div>
  )
}

// ── Sub-componentes internos ──────────────────────────────────

function DataBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: '#475569', wordBreak: 'break-all' }}>{value ?? '—'}</div>
    </div>
  )
}

function JsonBlock({ label, dados }: { label: string; dados: Record<string, unknown> }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <pre style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
        padding: '8px 10px', fontSize: '0.7rem', color: '#334155',
        overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}>
        {JSON.stringify(dados, null, 2)}
      </pre>
    </div>
  )
}
