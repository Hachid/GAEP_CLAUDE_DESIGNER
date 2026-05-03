'use client'

import { useRef, useState } from 'react'
import { uploadRelatorioFoto } from '@/app/relatorio/actions'

interface FotoUploadProps {
  /** Mantido para compatibilidade; o GAEP no Storage vem do operador autenticado no servidor. */
  gaepCodigo: string
  categoria: string
  atividade: string
  data: string
  onUpload: (urls: string[]) => void
}

/**
 * Área de upload de fotos para o Supabase Storage.
 *
 * - Máximo de 3 fotos por relatório.
 * - Nome do arquivo: `gaep-fotos/{codigo}/fotos/{DD-MM-AAAA}_{CATEGORIA}_{ATIVIDADE}_{N}.{ext}`
 * - Upload via Server Action (service role) para contornar RLS do Storage no cliente.
 * - Exibe thumbnails 65×65px após o upload bem-sucedido.
 */
export function FotoUpload(props: FotoUploadProps) {
  const { categoria, atividade, data, onUpload } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [erroUpload, setErroUpload] = useState<string | null>(null)

  async function handleFiles(files: FileList) {
    const remaining = 3 - uploadedUrls.length
    if (remaining <= 0) return
    const selected = Array.from(files).slice(0, remaining)
    setUploading(true)
    setErroUpload(null)

    const newUrls: string[] = []
    const newPreviews: string[] = []

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      const n = uploadedUrls.length + i + 1
      const fd = new FormData()
      fd.append('file', file)
      fd.append('data', data)
      fd.append('categoria', categoria)
      fd.append('atividade', atividade)
      fd.append('indice', String(n))

      const res = await uploadRelatorioFoto(fd)
      if (res.url) {
        newUrls.push(res.url)
        newPreviews.push(URL.createObjectURL(file))
      } else {
        const msg = res.error ?? 'Falha no envio da foto.'
        setErroUpload(msg)
        if (process.env.NODE_ENV === 'development') {
          console.warn('[FotoUpload] upload falhou:', msg)
        }
      }
    }

    const merged = [...uploadedUrls, ...newUrls]
    setUploadedUrls(merged)
    setPreviews((p) => [...p, ...newPreviews])
    onUpload(merged)
    setUploading(false)
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

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>FOTOS</label>

      {erroUpload && (
        <div
          role="alert"
          style={{
            marginBottom: 10,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#b91c1c',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          {erroUpload}
        </div>
      )}

      {uploadedUrls.length < 3 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: '22px', textAlign: 'center', background: 'rgba(26,35,126,0.02)', cursor: 'pointer' }}
        >
          {uploading ? (
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>⏳ Enviando...</div>
          ) : (
            <>
              <div style={{ fontSize: '2rem' }}>📸</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>
                Toque para Câmera ou Galeria — Máx. 3 fotos.
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
        }}
      />

      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`foto ${i + 1}`}
              style={{ width: 65, height: 65, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
