import { describe, expect, it } from 'vitest'
import { normalizeFotosUrls } from '@/lib/pdf/normalizeFotosUrls'

describe('normalizeFotosUrls', () => {
  it('aceita array JS', () => {
    expect(normalizeFotosUrls(['https://a/x.jpg', 'https://b/y.png'])).toEqual([
      'https://a/x.jpg',
      'https://b/y.png',
    ])
  })

  it('aceita literal Postgres TEXT[] com uma URL', () => {
    const pg = '{https://proj.supabase.co/storage/v1/object/public/gaep-fotos/cod/fotos/1.jpg}'
    expect(normalizeFotosUrls(pg)).toEqual([
      'https://proj.supabase.co/storage/v1/object/public/gaep-fotos/cod/fotos/1.jpg',
    ])
  })

  it('aceita literal Postgres com aspas (vírgulas na URL)', () => {
    const pg =
      '{"https://exemplo.com/storage/v1/object/public/b/a,b.jpg","https://exemplo.com/z.jpg"}'
    expect(normalizeFotosUrls(pg)).toEqual([
      'https://exemplo.com/storage/v1/object/public/b/a,b.jpg',
      'https://exemplo.com/z.jpg',
    ])
  })

  it('aceita JSON string', () => {
    expect(normalizeFotosUrls('["https://a/1.jpg"]')).toEqual(['https://a/1.jpg'])
  })

  it('expande várias URLs em um único elemento separadas por pipe (legado / import CSV)', () => {
    expect(
      normalizeFotosUrls(['https://a.com/1.jpg|https://b.com/2.png'])
    ).toEqual(['https://a.com/1.jpg', 'https://b.com/2.png'])
  })

  it('expande string única com URLs separadas por pipe', () => {
    expect(
      normalizeFotosUrls('https://a.com/1.jpg|https://b.com/2.png')
    ).toEqual(['https://a.com/1.jpg', 'https://b.com/2.png'])
  })

  it('aceita data URL em string', () => {
    const d = 'data:image/jpeg;base64,abc'
    expect(normalizeFotosUrls(d)).toEqual([d])
  })

  it('aceita caminho de objeto no Storage sem URL (layout gaep/fotos/…)', () => {
    expect(normalizeFotosUrls('meu-gaep/fotos/01-05-2026_OP_FOTO_1.jpg')).toEqual([
      'meu-gaep/fotos/01-05-2026_OP_FOTO_1.jpg',
    ])
  })

  it('aceita caminho com prefixo do bucket na string', () => {
    expect(normalizeFotosUrls('gaep-fotos/meu-gaep/fotos/foto.jpg')).toEqual([
      'gaep-fotos/meu-gaep/fotos/foto.jpg',
    ])
  })
})
