'use client'

import { useEffect, useRef, useState } from 'react'

/** Props do bloco unificado de data e horários. */
interface DateTimeBlockProps {
  date: string
  startTime: string
  endTime: string
  onDateChange: (date: string) => void
  onStartChange: (time: string) => void
  onEndChange: (time: string) => void
}

/**
 * Card compacto de data e horários do turno.
 * Calcula e exibe a duração automaticamente quando os dois horários são preenchidos.
 * Suporta turnos que cruzam meia-noite (ex.: 22:00 → 06:00).
 */
export function DateTimeBlock({ date, startTime, endTime, onDateChange, onStartChange, onEndChange }: DateTimeBlockProps) {
  const [duracao, setDuracao] = useState<string | null>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)

  function calcDuracao() {
    const start = startRef.current?.value
    const end = endRef.current?.value
    if (!start || !end) {
      setDuracao(null)
      return
    }
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
    const h = Math.floor(mins / 60)
    const m = mins % 60
    setDuracao(m > 0 ? `${h}h ${m}min` : `${h}h`)
  }

  useEffect(() => {
    if (!startTime || !endTime) {
      setDuracao(null)
      return
    }
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
    const h = Math.floor(mins / 60)
    const m = mins % 60
    setDuracao(m > 0 ? `${h}h ${m}min` : `${h}h`)
  }, [startTime, endTime])

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      {/* Linha 1: Data */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.3rem' }}>📅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
            Data do Turno
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 700, color: '#1e293b', width: '100%', outline: 'none', padding: 0 }}
          />
        </div>
      </div>

      {/* Linha 2: Horários */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '14px 16px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
            ⏱ Início
          </div>
          <input
            type="time"
            ref={startRef}
            value={startTime}
            onChange={(e) => { onStartChange(e.target.value); calcDuracao() }}
            style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 800, color: '#1a237e', width: '100%', outline: 'none', padding: 0 }}
          />
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
            🏁 Término
          </div>
          <input
            type="time"
            ref={endRef}
            value={endTime}
            onChange={(e) => { onEndChange(e.target.value); calcDuracao() }}
            style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 800, color: '#1a237e', width: '100%', outline: 'none', padding: 0 }}
          />
        </div>
      </div>

      {/* Linha 3 condicional: Duração */}
      {duracao && (
        <div style={{ background: 'rgba(249,115,22,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 700 }}>⏳ Duração: {duracao}</span>
        </div>
      )}
    </div>
  )
}
