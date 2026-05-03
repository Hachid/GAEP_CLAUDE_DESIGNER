import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Extrai bucket + caminho do objeto a partir da URL pública ou assinada do Storage Supabase.
 */
export function parseSupabaseStorageObjectUrl(url: string): { bucket: string; objectPath: string } | null {
  try {
    const u = new URL(url)
    const pathname = u.pathname
    for (const marker of [
      '/object/public/',
      '/object/sign/',
      '/object/authenticated/',
      /** URLs de preview com transformação (`getPublicUrl` + `transform`) */
      '/render/image/public/',
    ] as const) {
      const i = pathname.indexOf(marker)
      if (i === -1) continue
      const rest = pathname.slice(i + marker.length)
      const slash = rest.indexOf('/')
      if (slash === -1) return null
      const bucket = rest.slice(0, slash)
      const objectPath = decodeURIComponent(rest.slice(slash + 1))
      if (!bucket || !objectPath) return null
      return { bucket, objectPath }
    }
  } catch {
    /* URL inválida */
  }
  return null
}

function bufferToDataUrl(buf: Buffer, contentType: string): string {
  const ct = contentType.split(';')[0]?.trim() || 'application/octet-stream'
  return `data:${ct};base64,${buf.toString('base64')}`
}

function tracePdfImage(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/** Baixa imagem por URL HTTP(S) anônima. */
async function fetchUrlAsBuffer(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const finalUrl = url.startsWith('//') ? `https:${url}` : url
  try {
    if (tracePdfImage()) {
      console.log('[PDF][image] fetch url:', finalUrl.length > 160 ? `${finalUrl.slice(0, 160)}…` : finalUrl)
    }
    const res = await fetch(finalUrl, { cache: 'no-store' })
    if (tracePdfImage()) {
      console.log('[PDF][image] fetch status:', res.status, res.statusText)
      console.log('[PDF][image] content-type:', res.headers.get('content-type'))
    }
    if (!res.ok) {
      const partial =
        finalUrl.length > 90 ? `${finalUrl.slice(0, 42)}…${finalUrl.slice(-35)}` : finalUrl
      console.warn('[PDF][image] fetch não-OK:', res.status, partial)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
    return { buf, contentType: ct }
  } catch (e) {
    if (tracePdfImage()) {
      console.warn('[PDF][image] fetch exceção:', e instanceof Error ? e.message : e)
    }
    return null
  }
}

/** Baixa do Storage com permissão de serviço (bucket privado). */
async function downloadStorageAsBuffer(
  admin: Admin,
  bucket: string,
  objectPath: string
): Promise<{ buf: Buffer; contentType: string } | null> {
  const { data, error } = await admin.storage.from(bucket).download(objectPath)
  if (error || !data) {
    console.warn('[pdf] Storage download falhou:', bucket, objectPath, error?.message)
    return null
  }
  const buf = Buffer.from(await data.arrayBuffer())
  const ct = data.type && data.type !== 'application/octet-stream' ? data.type : 'image/jpeg'
  return { buf, contentType: ct }
}

/**
 * Resolve uma URL de imagem (data URL, Supabase Storage ou HTTP) para buffer + tipo.
 */
export async function resolveImageToBuffer(admin: Admin, url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const u = url.trim().replace(/[\r\n]/g, '')

  if (u.startsWith('data:')) {
    const comma = u.indexOf(',')
    if (comma === -1) return null
    const header = u.slice(5, comma)
    const b64 = u.slice(comma + 1).replace(/\s/g, '')
    const isBase64 = /;base64$/i.test(header) || header.includes(';base64')
    const ct = header.split(';')[0]?.trim() || 'image/png'
    try {
      const buf = isBase64 ? Buffer.from(b64, 'base64') : Buffer.from(decodeURIComponent(b64), 'utf8')
      return { buf, contentType: ct }
    } catch {
      return null
    }
  }

  const parsed = parseSupabaseStorageObjectUrl(u)
  if (parsed) {
    const fromStorage = await downloadStorageAsBuffer(admin, parsed.bucket, parsed.objectPath)
    if (fromStorage) return fromStorage
  }

  /**
   * Objeto no bucket `gaep-fotos` sem URL completa (mesmo padrão do upload no app).
   * O cliente admin ignora RLS e baixa mesmo se o bucket não for público.
   */
  if (!u.includes('://')) {
    const bucket = 'gaep-fotos'
    let objectPath: string | null = null
    const prefixed = u.match(/^gaep-fotos\/(.+)/i)
    if (prefixed?.[1]) {
      objectPath = prefixed[1]
    } else if (/\S+\/fotos\/\S+/i.test(u)) {
      objectPath = u
    }
    if (objectPath) {
      const fromStorage = await downloadStorageAsBuffer(admin, bucket, objectPath)
      if (fromStorage) return fromStorage
    }
  }

  return fetchUrlAsBuffer(u)
}

/**
 * Redimensiona foto para PDF: limita aresta longa (boa qualidade na impressão ~6 cm),
 * JPEG com compressão moderada (arquivo menor sem artefatos fortes).
 */
export async function fotoBufferToPdfDataUrl(
  buf: Buffer,
  contentTypeHint = 'image/jpeg'
): Promise<string> {
  const ct = contentTypeHint.split(';')[0]?.trim() || 'image/jpeg'
  try {
    const sharp = (await import('sharp')).default
    const img = sharp(buf).rotate()
    const meta = await img.metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const maxEdge = 1800
    let pipeline = img
    if (w > maxEdge || h > maxEdge) {
      pipeline = pipeline.resize({
        width: w >= h ? maxEdge : undefined,
        height: h > w ? maxEdge : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }
    const out = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
    return bufferToDataUrl(out, 'image/jpeg')
  } catch (e) {
    console.warn('[pdf] sharp indisponível ou falhou; usando imagem original.', e)
    const fallback = bufferToDataUrl(buf, ct)
    if (fallback.startsWith('data:image/')) return fallback
    return bufferToDataUrl(buf, 'image/jpeg')
  }
}

export async function timbradoBufferToPdfDataUrl(buf: Buffer, contentType: string): Promise<string> {
  const ct = contentType || 'image/jpeg'
  if (!ct.includes('png') && !ct.includes('webp')) {
    return bufferToDataUrl(buf, ct)
  }
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(buf).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    const maxEdge = 2400
    let pipeline = sharp(buf)
    if (w > maxEdge || h > maxEdge) {
      pipeline = pipeline.resize({
        width: w >= h ? maxEdge : undefined,
        height: h > w ? maxEdge : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }
    const out = await pipeline.png({ compressionLevel: 8 }).toBuffer()
    return bufferToDataUrl(out, 'image/png')
  } catch {
    return bufferToDataUrl(buf, ct)
  }
}
