'use client'

import { useEffect, useRef, useState } from 'react'

interface DescricaoMicProps {
  value: string
  onChange: (value: string) => void
}

/**
 * Textarea com botão de microfone flutuante para ditado por voz.
 *
 * Usa a Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Se a API não estiver disponível no browser, o botão fica silenciosamente inativo.
 * O texto ditado é ANEXADO ao conteúdo existente (não substitui).
 */
export function DescricaoMic({ value, onChange }: DescricaoMicProps) {
  const [gravando, setGravando] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function toggleMic() {
    if (gravando) {
      recognitionRef.current?.stop()
      setGravando(false)
      return
    }

    const SR =
      (typeof window !== 'undefined' &&
        (window.SpeechRecognition ??
          (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
      null

    if (!SR) return

    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.interimResults = false
    rec.continuous = false

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      onChange(value ? `${value} ${transcript}` : transcript)
    }
    rec.onend = () => setGravando(false)

    recognitionRef.current = rec
    rec.start()
    setGravando(true)
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        DESCRIÇÃO DOS FATOS
      </label>
      <div style={{ position: 'relative' }}>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Descreva a atividade ou toque no microfone..."
          style={{
            width: '100%',
            padding: '12px 14px',
            paddingRight: 60,
            background: '#f3f4f6',
            border: '1px solid #e2e8f0',
            color: '#1e293b',
            borderRadius: 10,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            border: 'none',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width: 20, height: 20 }}>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  )
}
