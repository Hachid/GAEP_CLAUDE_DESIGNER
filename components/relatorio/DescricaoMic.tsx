'use client'

import { useEffect, useRef, useState } from 'react'

interface DescricaoMicProps {
  value: string
  onChange: (value: string) => void
}

interface SpeechResult {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}
interface SpeechResultList {
  readonly length: number
  readonly [index: number]: SpeechResult
}
interface SpeechResultEvent {
  readonly results: SpeechResultList
  readonly resultIndex: number
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike
type BrowserWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as BrowserWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function DescricaoMic({ value, onChange }: DescricaoMicProps) {
  const [gravando, setGravando] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [semSupporte, setSemSupporte] = useState(false)

  const gravandoRef = useRef(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  // Texto confirmado acumulado durante a sessão de gravação
  const confirmedRef = useRef('')

  useEffect(() => {
    if (!getSR()) setSemSupporte(true)
    return () => {
      gravandoRef.current = false
      recRef.current?.stop()
    }
  }, [])

  function iniciarGravacao() {
    const SR = getSR()
    if (!SR || !gravandoRef.current) return

    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    // continuous: false é necessário para iOS Safari
    rec.continuous = false

    rec.onresult = (e) => {
      let finalPart = ''
      let interimPart = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalPart += e.results[i][0].transcript
        } else {
          interimPart += e.results[i][0].transcript
        }
      }
      if (finalPart) {
        confirmedRef.current = confirmedRef.current
          ? `${confirmedRef.current} ${finalPart}`
          : finalPart
        onChange(confirmedRef.current)
        setInterimText('')
      }
      if (interimPart) {
        setInterimText(interimPart)
      }
    }

    rec.onend = () => {
      setInterimText('')
      // iOS para após cada frase — reinicia automaticamente se ainda gravando
      if (gravandoRef.current) {
        setTimeout(() => {
          if (gravandoRef.current) iniciarGravacao()
        }, 80)
      }
    }

    rec.onerror = (e) => {
      setInterimText('')
      if (e.error === 'not-allowed') {
        setSemSupporte(true)
        setGravando(false)
        gravandoRef.current = false
      } else if (e.error === 'aborted') {
        // Esperado ao chamar stop() manualmente — ignora
      }
      // no-speech e outros: onend vai reiniciar se ainda gravando
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      // Se start() falhar, onend nunca dispara — agenda nova tentativa
      if (gravandoRef.current) {
        setTimeout(() => { if (gravandoRef.current) iniciarGravacao() }, 200)
      }
    }
  }

  function toggleMic() {
    if (gravando) {
      gravandoRef.current = false
      recRef.current?.stop()
      setGravando(false)
      setInterimText('')
      return
    }

    const SR = getSR()
    if (!SR) return

    // Snapshot do texto atual como base da sessão
    confirmedRef.current = value
    gravandoRef.current = true
    setGravando(true)
    iniciarGravacao()
  }

  // Durante gravação: mostra o texto confirmado + o que está sendo dito agora
  const displayValue = gravando && interimText
    ? `${confirmedRef.current}${confirmedRef.current ? ' ' : ''}${interimText}`
    : value

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', marginBottom: 6, fontWeight: 700,
        textTransform: 'uppercase', color: '#64748b',
        fontSize: '0.75rem', letterSpacing: 0.5,
      }}>
        DESCRIÇÃO DOS FATOS
      </label>
      <div style={{ position: 'relative' }}>
        <textarea
          rows={4}
          value={displayValue}
          onChange={(e) => { if (!gravando) onChange(e.target.value) }}
          placeholder="Descreva a atividade ou toque no microfone..."
          maxLength={5000}
          readOnly={gravando}
          style={{
            width: '100%',
            padding: '12px 14px',
            paddingRight: 60,
            background: gravando ? '#f0f4ff' : '#f3f4f6',
            border: `1.5px solid ${gravando ? '#6366f1' : '#e2e8f0'}`,
            color: gravando && interimText ? '#6366f1' : '#1e293b',
            borderRadius: 10,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'vertical',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        />
        {!semSupporte && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={gravando ? 'Parar gravação' : 'Iniciar gravação por voz'}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: gravando ? '#ef4444' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              boxShadow: gravando
                ? '0 0 0 5px rgba(239,68,68,0.25), 0 4px 12px rgba(239,68,68,0.35)'
                : '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {gravando ? (
              <svg viewBox="0 0 24 24" fill="#fff" style={{ width: 16, height: 16 }}>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width: 20, height: 20 }}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}
      </div>
      {gravando && (
        <p style={{
          margin: '5px 0 0 0', fontSize: '0.72rem',
          color: '#6366f1', fontWeight: 600,
        }}>
          🎙️ Ouvindo… toque no botão vermelho para parar
        </p>
      )}
    </div>
  )
}
