'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DateTimeBlock } from '@/components/relatorio/DateTimeBlock'
import { EquipeChips } from '@/components/relatorio/EquipeChips'
import { FotoUpload } from '@/components/relatorio/FotoUpload'
import { DescricaoMic } from '@/components/relatorio/DescricaoMic'
import type { RelatorioDetalhado } from '../../actions'
import { atualizarRelatorioCompleto } from '../../actions'

interface Operador { id: string; nome: string }
interface Categoria { id: string; nome: string }
interface Atividade { id: string; nome: string }

function sliceHora(h: string | null | undefined): string {
  if (!h) return '08:00'
  return h.slice(0, 5)
}

function calcHorasTotais(horaInicio: string, horaFim: string): number {
  if (!horaInicio || !horaFim) return 0
  const [sh, sm] = horaInicio.split(':').map(Number)
  const [eh, em] = horaFim.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  fontSize: '0.75rem',
  letterSpacing: 0.5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: '#f3f4f6',
  border: '1px solid #e2e8f0',
  color: '#1e293b',
  borderRadius: 10,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

interface Props {
  relatorio: RelatorioDetalhado
  operadorAtual: Operador
  gaepCodigo: string
  operadores: Operador[]
  categorias: Categoria[]
  atividades: Atividade[]
}

export function RelatorioEditarForm({
  relatorio,
  operadorAtual,
  gaepCodigo,
  operadores,
  categorias,
  atividades,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState(relatorio.data)
  const [horaInicio, setHoraInicio] = useState(sliceHora(relatorio.hora_inicio))
  const [horaFim, setHoraFim] = useState(sliceHora(relatorio.hora_fim))
  const [categoriaId, setCategoriaId] = useState(relatorio.categoria_id ?? '')
  const [atividadeId, setAtividadeId] = useState(relatorio.atividade_id ?? '')
  const [outrosIntegrantes, setOutrosIntegrantes] = useState(relatorio.outros_integrantes ?? '')
  const [equipe, setEquipe] = useState<string[]>(
    relatorio.participantes.length > 0 ? relatorio.participantes.map((p) => p.id) : operadores.map((o) => o.id)
  )
  const [fotosUrls, setFotosUrls] = useState<string[]>(relatorio.fotos_urls ?? [])
  const [descricao, setDescricao] = useState(relatorio.descricao_revisada)
  const [ocorrencias, setOcorrencias] = useState(relatorio.ocorrencias ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId)
  const atividadeSelecionada = atividades.find((a) => a.id === atividadeId)

  function validar(): string | null {
    if (!data) return 'Preencha a data da operação.'
    if (!horaInicio || !horaFim) return 'Preencha horário inicial e final.'
    if (equipe.length === 0) return 'Selecione ao menos um operador na equipe.'
    if (!categoriaId) return 'Selecione a categoria.'
    if (!atividadeId) return 'Selecione a atividade.'
    if (!descricao.trim()) return 'Preencha a descrição.'
    return null
  }

  async function handleSalvar() {
    const v = validar()
    if (v) {
      setErro(v)
      return
    }
    setSalvando(true)
    setErro(null)
    setOk(false)
    const result = await atualizarRelatorioCompleto({
      id: relatorio.id,
      operadorId: operadorAtual.id,
      data,
      horaInicio,
      horaFim,
      horasTotais: calcHorasTotais(horaInicio, horaFim),
      categoriaId,
      atividadeId,
      outrosIntegrantes,
      descricaoBruta: descricao.trim(),
      descricaoRevisada: descricao.trim(),
      ocorrencias,
      fotosUrls,
      equipe,
    })
    setSalvando(false)
    if (result.error) {
      setErro(result.error)
      return
    }
    setOk(true)
    router.refresh()
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Link href="/relatorio/historico" prefetch={false} style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.15rem', lineHeight: 1 }}>
          ←
        </Link>
        <h1 style={{ flex: 1, fontSize: '1.05rem', fontWeight: 800, color: '#1a237e', margin: 0 }}>
          Editar relatório
        </h1>
      </div>

      {erro && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
          {erro}
        </div>
      )}
      {ok && (
        <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '12px 14px', color: '#16a34a', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
          Alterações salvas.
        </div>
      )}

      <DateTimeBlock
        date={data}
        startTime={horaInicio}
        endTime={horaFim}
        onDateChange={setData}
        onStartChange={setHoraInicio}
        onEndChange={setHoraFim}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={labelStyle}>CATEGORIA</label>
          <select
            style={inputStyle}
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value)
              setAtividadeId('')
            }}
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Atividade</label>
          <select style={inputStyle} value={atividadeId} onChange={(e) => setAtividadeId(e.target.value)}>
            <option value="">Selecione...</option>
            {atividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <EquipeChips operadores={operadores} value={equipe} onChange={setEquipe} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Nome dos Outros Integrantes</label>
        <input
          type="text"
          maxLength={500}
          style={inputStyle}
          value={outrosIntegrantes}
          onChange={(e) => setOutrosIntegrantes(e.target.value)}
          placeholder="Outros integrantes ou Forças Amigas"
        />
      </div>

      <FotoUpload
        gaepCodigo={gaepCodigo}
        categoria={categoriaSelecionada?.nome ?? 'GERAL'}
        atividade={atividadeSelecionada?.nome ?? 'ATIVIDADE'}
        data={data}
        initialUrls={relatorio.fotos_urls ?? []}
        onUpload={setFotosUrls}
      />

      <DescricaoMic value={descricao} onChange={setDescricao} />

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Ocorrências / observações</label>
        <textarea
          value={ocorrencias}
          onChange={(e) => setOcorrencias(e.target.value)}
          rows={4}
          maxLength={1000}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="Opcional"
        />
      </div>

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        style={{
          width: '100%',
          padding: '14px',
          background: '#1a237e',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: '0.95rem',
          cursor: salvando ? 'not-allowed' : 'pointer',
          marginBottom: 12,
        }}
      >
        {salvando ? 'Salvando...' : 'Salvar alterações'}
      </button>

      <Link
        href={`/relatorio/${relatorio.id}`}
        prefetch={false}
        style={{ display: 'block', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.88rem' }}
      >
        Ver relatório (somente leitura)
      </Link>
    </div>
  )
}
