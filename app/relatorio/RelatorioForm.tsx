'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DateTimeBlock } from '@/components/relatorio/DateTimeBlock'
import { EquipeChips } from '@/components/relatorio/EquipeChips'
import { FotoUpload } from '@/components/relatorio/FotoUpload'
import { DescricaoMic } from '@/components/relatorio/DescricaoMic'
import { BotoesAcao } from '@/components/relatorio/BotoesAcao'
import { AreaRevisao } from '@/components/relatorio/AreaRevisao'
import { salvarRelatorio } from './actions'

interface Operador {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

interface Atividade {
  id: string
  nome: string
}

interface RelatorioFormProps {
  operadorAtual: Operador
  gaepId: string
  gaepCodigo: string
  operadores: Operador[]
  categorias: Categoria[]
  atividades: Atividade[]
}

interface IAResponse {
  descricaoRevisada?: string
  error?: string
}

interface Feedback {
  tipo: 'ok' | 'err'
  msg: string
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

/**
 * Calcula o total de horas. Quando plantão=true e dataFim > data, usa
 * aritmética de datas para suportar turnos de 24h+.
 */
function calcHorasTotais(
  horaInicio: string,
  horaFim: string,
  data: string,
  dataFim: string | null,
  plantao: boolean
): number {
  if (!horaInicio || !horaFim) return 0
  if (plantao && dataFim && dataFim > data && data) {
    const start = new Date(`${data}T${horaInicio}:00`)
    const end = new Date(`${dataFim}T${horaFim}:00`)
    const mins = (end.getTime() - start.getTime()) / 60000
    return Math.max(0, Math.round((mins / 60) * 100) / 100)
  }
  const [sh, sm] = horaInicio.split(':').map(Number)
  const [eh, em] = horaFim.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

/**
 * Formulário interativo de Registro Operacional.
 *
 * Recebe todos os dados necessários como props (Server Component pai faz o fetch).
 * Gerencia o fluxo completo: preenchimento → IA opcional → salvamento no Supabase.
 */
export function RelatorioForm({
  operadorAtual,
  gaepId,
  gaepCodigo,
  operadores,
  categorias,
  atividades,
}: RelatorioFormProps) {
  // ── Estado do formulário ──────────────────────────────────────
  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('15:00')
  const [plantao, setPlantao] = useState(false)
  const [dataFim, setDataFim] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [atividadeId, setAtividadeId] = useState('')
  const [outrosIntegrantes, setOutrosIntegrantes] = useState('')
  const [equipe, setEquipe] = useState<string[]>(operadores.map((o) => o.id))
  const [fotosUrls, setFotosUrls] = useState<string[]>([])
  const [descricao, setDescricao] = useState('')

  // ── Estado da UI ──────────────────────────────────────────────
  const [iaLoading, setIaLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [descricaoRevisada, setDescricaoRevisada] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [relatorioSalvoId, setRelatorioSalvoId] = useState<string | null>(null)
  const [fotoUploadKey, setFotoUploadKey] = useState(0)

  useEffect(() => {
    if (!data) {
      setData(new Date().toISOString().split('T')[0])
    }
  }, [data])

  // ── Derivados ─────────────────────────────────────────────────
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId)
  const atividadeSelecionada = atividades.find((a) => a.id === atividadeId)
  const equipeNomes = operadores.filter((o) => equipe.includes(o.id)).map((o) => o.nome)

  function resetarFormulario() {
    setData(new Date().toISOString().split('T')[0])
    setHoraInicio('08:00')
    setHoraFim('15:00')
    setPlantao(false)
    setDataFim('')
    setCategoriaId('')
    setAtividadeId('')
    setOutrosIntegrantes('')
    setEquipe(operadores.map((o) => o.id))
    setFotosUrls([])
    setDescricao('')
    setDescricaoRevisada(null)
    setFotoUploadKey((current) => current + 1)
  }

  /**
   * Valida os campos obrigatórios para salvar/consolidar o relatório.
   * Retorna a primeira mensagem de erro orientada ao relatorista.
   */
  function validarCamposObrigatorios(): string | null {
    if (!data) return 'Preencha a data da operação para salvar o relatório.'
    if (!horaInicio || !horaFim) return 'Preencha horário inicial e final da operação.'
    if (equipe.length === 0) return 'Selecione ao menos um operador na equipe.'
    if (!categoriaId) return 'Selecione a categoria da operação.'
    if (!atividadeId) return 'Selecione a atividade realizada.'
    return null
  }

  /** Salva o relatório sem passar pela IA (descrição bruta vira descrição oficial). */
  async function handleSalvarDireto() {
    const erroCampos = validarCamposObrigatorios()
    if (erroCampos) {
      setFeedback({ tipo: 'err', msg: `⚠️ ${erroCampos}` })
      return
    }
    if (!descricao.trim()) {
      setFeedback({ tipo: 'err', msg: 'Preencha a descrição antes de salvar.' })
      return
    }
    setSalvando(true)
    setFeedback(null)
    try {
      const fotos = fotosUrls
      if (process.env.NODE_ENV === 'development') {
        console.log('[RELATORIO][save] fotos antes do submit:', fotos)
      }
      const result = await salvarRelatorio({
        gaepId,
        relatoristId: operadorAtual.id,
        data,
        horaInicio,
        horaFim,
        horasTotais: calcHorasTotais(horaInicio, horaFim, data, plantao ? dataFim : null, plantao),
        plantao,
        dataFim: plantao && dataFim ? dataFim : undefined,
        categoriaId,
        atividadeId,
        outrosIntegrantes,
        descricaoBruta: descricao,
        descricaoRevisada: descricao,
        ocorrencias: '',
        fotosUrls: fotos,
        equipe,
      })
      if (result.error) {
        setFeedback({ tipo: 'err', msg: result.error })
      } else {
        setFeedback({ tipo: 'ok', msg: '✅ Operação registrada com sucesso!' })
        if (result.id) setRelatorioSalvoId(result.id)
        resetarFormulario()
      }
    } catch (err) {
      console.error('[RelatorioForm] Erro inesperado ao salvar direto:', err)
      setFeedback({ tipo: 'err', msg: 'Erro inesperado. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  /** Envia a descrição bruta para o GPT-4o e exibe o texto revisado na AreaRevisao. */
  async function handleRedigirIA() {
    const erroCampos = validarCamposObrigatorios()
    if (erroCampos) {
      setFeedback({ tipo: 'err', msg: `⚠️ ${erroCampos}` })
      return
    }
    if (!descricao.trim()) {
      setFeedback({ tipo: 'err', msg: 'Preencha a descrição antes de redigir.' })
      return
    }
    setIaLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaepId,
          data,
          horario: horaInicio && horaFim ? `${horaInicio} às ${horaFim}` : 'horário não informado',
          plantao: plantao && !!dataFim && dataFim > data,
          dataFim: plantao && dataFim && dataFim > data ? dataFim : undefined,
          categoria: categoriaSelecionada?.nome ?? '',
          atividade: atividadeSelecionada?.nome ?? '',
          equipe: equipeNomes,
          descricaoBruta: descricao,
        }),
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        setFeedback({ tipo: 'err', msg: errJson.error ?? `Erro HTTP ${res.status}` })
        return
      }

      const json = (await res.json()) as IAResponse
      if (json.error || !json.descricaoRevisada) {
        setFeedback({ tipo: 'err', msg: json.error ?? 'A IA não retornou conteúdo.' })
      } else {
        setDescricaoRevisada(json.descricaoRevisada)
      }
    } catch (err) {
      console.error('[RelatorioForm] Falha na chamada da IA:', err)
      setFeedback({ tipo: 'err', msg: 'Falha ao conectar com o serviço de IA.' })
    } finally {
      setIaLoading(false)
    }
  }

  /**
   * Salva o relatório com o texto revisado (pós-IA) e as observações adicionais.
   * Chamado pelo botão "Salvar & Consolidar Turno" dentro de AreaRevisao.
   */
  async function handleSalvarConsolidado(descricaoFinal: string, ocorrencias: string) {
    const erroCampos = validarCamposObrigatorios()
    if (erroCampos) {
      setFeedback({ tipo: 'err', msg: `⚠️ ${erroCampos}` })
      return
    }
    setSalvando(true)
    setFeedback(null)
    try {
      const fotos = fotosUrls
      if (process.env.NODE_ENV === 'development') {
        console.log('[RELATORIO][save] fotos antes do submit:', fotos)
      }
      const result = await salvarRelatorio({
        gaepId,
        relatoristId: operadorAtual.id,
        data,
        horaInicio,
        horaFim,
        horasTotais: calcHorasTotais(horaInicio, horaFim, data, plantao ? dataFim : null, plantao),
        plantao,
        dataFim: plantao && dataFim ? dataFim : undefined,
        categoriaId,
        atividadeId,
        outrosIntegrantes,
        descricaoBruta: descricao,
        descricaoRevisada: descricaoFinal,
        ocorrencias,
        fotosUrls: fotos,
        equipe,
      })
      if (result.error) {
        setFeedback({ tipo: 'err', msg: result.error })
      } else {
        setFeedback({ tipo: 'ok', msg: '✅ Turno consolidado com sucesso!' })
        if (result.id) setRelatorioSalvoId(result.id)
        resetarFormulario()
      }
    } catch (err) {
      console.error('[RelatorioForm] Erro inesperado ao consolidar turno:', err)
      setFeedback({ tipo: 'err', msg: 'Erro inesperado. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Relatorista badge */}
      <div style={{ background: 'rgba(26,35,126,0.05)', borderLeft: '4px solid #1a237e', padding: '12px 16px', borderRadius: 8, marginBottom: 22 }}>
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Relatorista Ativo:
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a237e', marginTop: 2 }}>
          {operadorAtual.nome}
        </div>
      </div>

      {/* Data + Horários */}
      <DateTimeBlock
        date={data}
        startTime={horaInicio}
        endTime={horaFim}
        onDateChange={setData}
        onStartChange={setHoraInicio}
        onEndChange={setHoraFim}
        plantao={plantao}
        dataFim={dataFim}
        onPlantaoChange={setPlantao}
        onDataFimChange={setDataFim}
      />

      {/* Categoria + Atividade */}
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
          <select
            style={inputStyle}
            value={atividadeId}
            onChange={(e) => setAtividadeId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {atividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: -10, marginBottom: 16, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.5 }}>
        Campos obrigatórios para salvar: <strong>data</strong>, <strong>horários</strong>, <strong>equipe (mín. 1)</strong>, <strong>categoria</strong> e <strong>atividade</strong>.
      </div>

      {/* Equipe chips */}
      <div style={{ marginBottom: 18 }}>
        <EquipeChips operadores={operadores} value={equipe} onChange={setEquipe} />
      </div>

      {/* Outros integrantes */}
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

      {/* Fotos */}
      <FotoUpload
        key={fotoUploadKey}
        gaepCodigo={gaepCodigo}
        categoria={categoriaSelecionada?.nome ?? 'GERAL'}
        atividade={atividadeSelecionada?.nome ?? 'ATIVIDADE'}
        data={data}
        onUpload={setFotosUrls}
      />

      {/* Descrição + Mic */}
      <DescricaoMic value={descricao} onChange={setDescricao} />

      {/* Botões */}
      <BotoesAcao
        onSalvarDireto={handleSalvarDireto}
        onRedigirIA={handleRedigirIA}
        iaLoading={iaLoading}
        salvando={salvando}
      />

      {/* Feedback */}
      {feedback && (
        <div
          role={feedback.tipo === 'err' ? 'alert' : 'status'}
          style={{
            textAlign: 'center',
            padding: 14,
            borderRadius: 10,
            fontWeight: 700,
            color: feedback.tipo === 'ok' ? '#16a34a' : '#ef4444',
            background:
              feedback.tipo === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${feedback.tipo === 'ok' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
            marginBottom: 12,
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Acesso ao relatório salvo */}
      {relatorioSalvoId && (
        <Link
          href={`/relatorio/${relatorioSalvoId}`}
          prefetch={false}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginBottom: 16,
            textAlign: 'center',
            padding: '14px 0',
            background: '#1a237e',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
            letterSpacing: 0.5,
            animation: 'fadeIn .3s',
          }}
        >
          VER RELATÓRIO
        </Link>
      )}

      {/* Área de revisão IA */}
      {descricaoRevisada && (
        <AreaRevisao
          descricaoRevisada={descricaoRevisada}
          onSalvar={handleSalvarConsolidado}
          salvando={salvando}
        />
      )}
    </div>
  )
}
