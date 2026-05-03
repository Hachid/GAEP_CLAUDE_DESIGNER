/**
 * Expande uma string que agrega várias URLs separadas por `|` (ex.: importação CSV legada
 * ou um único elemento TEXT[] com "url1|url2").
 */
function expandPipeSeparatedUrls(s: string): string[] {
  const t = s.trim()
  if (!t) return []
  if (!t.includes('|')) return [t]
  const parts = t.split('|').map((x) => x.trim()).filter(Boolean)
  const urlLike = (p: string) =>
    p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')
  if (parts.length > 1 && parts.every(urlLike)) return parts
  return [t]
}

/**
 * Normaliza `relatorios.fotos_urls` (Postgres TEXT[], JSON ou string) para `string[]`.
 * O driver / PostgREST às vezes devolve o literal PostgreSQL `{url1,url2}` em vez de array JS.
 */
export function normalizeFotosUrls(raw: unknown): string[] {
  if (raw == null) return []

  if (Array.isArray(raw)) {
    return raw
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      .flatMap((u) => expandPipeSeparatedUrls(u))
  }

  if (typeof raw !== 'string') return []

  const s = raw.trim()
  if (!s) return []

  if (s.startsWith('data:')) {
    return [s]
  }

  if (s.startsWith('{') && s.endsWith('}')) {
    return parsePostgresTextArrayLiteral(s).flatMap((u) => expandPipeSeparatedUrls(u))
  }

  try {
    const j = JSON.parse(s) as unknown
    if (Array.isArray(j)) {
      return j
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .flatMap((u) => expandPipeSeparatedUrls(u))
    }
  } catch {
    /* não é JSON */
  }

  if (s.startsWith('http://') || s.startsWith('https://')) {
    return expandPipeSeparatedUrls(s)
  }

  /**
   * Legado / importação: caminho de objeto no Storage sem URL completa
   * (ex.: `codigo-gaep/fotos/arquivo.jpg` ou `gaep-fotos/codigo/fotos/arquivo.jpg`),
   * mesmo layout do `FotoUpload` (bucket `gaep-fotos`).
   */
  if (looksLikeGaepStorageObjectPath(s)) {
    return expandPipeSeparatedUrls(s)
  }

  return []
}

function looksLikeGaepStorageObjectPath(s: string): boolean {
  if (!s || s.includes('://') || s.includes(' ')) return false
  if (/^gaep-fotos\/.+/i.test(s)) return true
  return /\S+\/fotos\/\S+/i.test(s)
}

/** Formato `{elem,elem}` com elementos entre aspas se necessário. */
function parsePostgresTextArrayLiteral(s: string): string[] {
  const inner = s.slice(1, -1).trim()
  if (!inner) return []

  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (c === '"') {
      inQuote = !inQuote
      continue
    }
    if (!inQuote && c === ',') {
      const t = cur.trim()
      if (t) out.push(t)
      cur = ''
      continue
    }
    cur += c
  }
  const last = cur.trim()
  if (last) out.push(last)
  return out
}
