'use client'

// Requires: npm install qrcode @types/qrcode
import { useEffect, useState } from 'react'

interface QrCodeProps {
  /** URL legada (ex.: link público do relatório). */
  url?: string
  /** Payload do QR (ex.: string `GAEP-CAT|ID:…|HASH:…`). Tem precedência sobre `url`. */
  value?: string
  size?: number
}

/**
 * Gera QR a partir de `value` ou `url`.
 * Exibe placeholder tracejado enquanto carrega ou se o módulo falhar.
 */
export function QrCode({ url, value, size = 44 }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const payload = (value ?? url ?? '').trim()

  useEffect(() => {
    let cancelled = false
    if (!payload) {
      setDataUrl(null)
      return
    }
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(payload, {
          width: size * 2,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
      )
      .then((url) => { if (!cancelled) setDataUrl(url) })
      .catch(() => { /* fallback to placeholder */ })
    return () => { cancelled = true }
  }, [payload, size])

  if (!dataUrl) {
    return (
      <div style={{
        width: size, height: size, flexShrink: 0,
        border: '1.5px dashed #aaa', borderRadius: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,3px)', gap: '1px' }}>
          {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((v, i) => (
            <div key={i} style={{ width: 3, height: 3, background: v ? '#888' : 'transparent' }} />
          ))}
        </div>
        <div style={{ fontSize: '5px', color: '#aaa', fontWeight: 700, marginTop: 1 }}>QR</div>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt="QR Code" width={size} height={size} style={{ display: 'block', flexShrink: 0 }} />
  )
}
