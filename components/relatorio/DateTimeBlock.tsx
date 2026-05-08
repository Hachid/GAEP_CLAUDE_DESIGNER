'use client'

import { useEffect } from 'react'

interface DateTimeBlockProps {
  date: string
  startTime: string
  endTime: string
  onDateChange: (date: string) => void
  onStartChange: (time: string) => void
  onEndChange: (time: string) => void
  plantao?: boolean
  dataFim?: string
  onPlantaoChange?: (v: boolean) => void
  onDataFimChange?: (d: string) => void
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function nowTimeRounded(): string {
  const now = new Date()
  const h = now.getHours()
  const raw = now.getMinutes()
  const m = Math.round(raw / 5) * 5
  const fH = m === 60 ? (h + 1) % 24 : h
  const fM = m === 60 ? 0 : m
  return `${String(fH).padStart(2, '0')}:${String(fM).padStart(2, '0')}`
}

function calcDuracaoStr(
  date: string,
  startTime: string,
  dataFim: string,
  endTime: string,
  plantao: boolean
): string | null {
  if (!startTime || !endTime) return null
  let mins: number
  if (plantao && dataFim && dataFim > date && date) {
    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(`${dataFim}T${endTime}:00`)
    mins = (end.getTime() - start.getTime()) / 60000
  } else {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    mins = eh * 60 + em - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
  }
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function DateTimeBlock({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartChange,
  onEndChange,
  plantao = false,
  dataFim = '',
  onPlantaoChange,
  onDataFimChange,
}: DateTimeBlockProps) {
  const duracao = calcDuracaoStr(date, startTime, dataFim, endTime, plantao)

  // Ao ativar plantão: data fim = data início + 1. Ao desativar: limpa.
  useEffect(() => {
    if (plantao && date) {
      onDataFimChange?.(addDays(date, 1))
    } else if (!plantao) {
      onDataFimChange?.('')
    }
  }, [plantao]) // eslint-disable-line react-hooks/exhaustive-deps

  // Se data início muda enquanto plantão está ativo, reajusta data fim para +1
  useEffect(() => {
    if (plantao && date) {
      onDataFimChange?.(addDays(date, 1))
    }
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const label: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
    display: 'block',
  }

  const dateInput: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1e293b',
    width: '100%',
    outline: 'none',
    padding: 0,
    minHeight: 44,
    touchAction: 'manipulation',
  }

  const timeInput: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#1a237e',
    width: '100%',
    outline: 'none',
    padding: 0,
    minHeight: 44,
    touchAction: 'manipulation',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

      {/* Toggle plantão — pill visual */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 16px',
        borderBottom: '1px solid #e2e8f0',
        background: plantao ? 'rgba(124,58,237,0.04)' : 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: plantao ? '#7c3aed' : '#64748b' }}>
          🌙 Plantão (turno multi-dia)
        </span>
        <input
          type="checkbox"
          checked={plantao}
          onChange={(e) => onPlantaoChange?.(e.target.checked)}
          style={{ display: 'none' }}
        />
        <div style={{ width: 46, height: 26, borderRadius: 13, background: plantao ? '#7c3aed' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: plantao ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
        </div>
      </label>

      {/* Datas */}
      <div style={{ display: 'grid', gridTemplateColumns: plantao ? '1fr 1fr' : '1fr', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '14px 16px', borderRight: plantao ? '1px solid #e2e8f0' : undefined }}>
          <span style={label}>📅 {plantao ? 'Data Início' : 'Data do Turno'}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            style={dateInput}
          />
        </div>

        {plantao && (
          <div style={{ padding: '14px 16px', background: 'rgba(124,58,237,0.03)' }}>
            <span style={{ ...label, color: '#7c3aed' }}>📅 Data Fim</span>
            <input
              type="date"
              value={dataFim}
              min={date || undefined}
              onChange={(e) => onDataFimChange?.(e.target.value)}
              style={{ ...dateInput, color: '#7c3aed' }}
            />
          </div>
        )}
      </div>

      {/* Horários */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: duracao ? '1px solid #e2e8f0' : undefined }}>
        <div style={{ padding: '14px 16px', borderRight: '1px solid #e2e8f0' }}>
          <span style={label}>⏱ Início</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            style={timeInput}
          />
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={label}>🏁 Término</span>
            <button
              type="button"
              onClick={() => onEndChange(nowTimeRounded())}
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#f97316',
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 6,
                padding: '3px 8px',
                cursor: 'pointer',
                minHeight: 26,
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              ⟳ Agora
            </button>
          </div>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            style={timeInput}
          />
        </div>
      </div>

      {/* Duração */}
      {duracao && (
        <div style={{ background: plantao ? 'rgba(124,58,237,0.07)' : 'rgba(249,115,22,0.07)', padding: '10px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: plantao ? '#7c3aed' : '#f97316', fontWeight: 700 }}>
            ⏳ Duração: {duracao}
          </span>
        </div>
      )}
    </div>
  )
}
