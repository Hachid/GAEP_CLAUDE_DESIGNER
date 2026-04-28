'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FotoUploadProps {
  gaepCodigo: string
  categoria: string
  atividade: string
  data: string
  onUpload: (urls: string[]) => void
}

export function FotoUpload({ gaepCodigo, categoria, atividade, data, onUpload }: FotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  async function handleFiles(files: FileList) {
    const remaining = 3 - uploadedUrls.length
    if (remaining <= 0) return
    const selected = Array.from(files).slice(0, remaining)
    setUploading(true)

    const supabase = createClient()
    const newUrls: string[] = []
    const newPreviews: string[] = []

    const [year, month, day] = data.split('-')
    const dateStr = `${day}-${month}-${year}`
    const catSlug = categoria.replace(/\s+/g, '_').toUpperCase()
    const atSlug = atividade.replace(/\s+/g, '_').toUpperCase()
    const bucket = 'gaep-fotos'

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      const n = uploadedUrls.length + i + 1
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${gaepCodigo.toLowerCase()}/fotos/${dateStr}_${catSlug}_${atSlug}_${n}.${ext}`

      const { data: uploadData, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (!error && uploadData) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploadData.path)
        newUrls.push(pub.publicUrl)
      }
      newPreviews.push(URL.createObjectURL(file))
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
