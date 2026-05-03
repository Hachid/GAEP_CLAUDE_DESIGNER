import { describe, expect, it } from 'vitest'
import { parseSupabaseStorageObjectUrl } from '@/lib/pdf/imageDataUrlForPdf'

describe('parseSupabaseStorageObjectUrl', () => {
  it('extrai bucket e caminho de URL pública do Storage', () => {
    const url =
      'https://xyzcompany.supabase.co/storage/v1/object/public/gaep-fotos/gaep-cat/fotos/01-05-2026_OP_FOTO_1.jpg'
    expect(parseSupabaseStorageObjectUrl(url)).toEqual({
      bucket: 'gaep-fotos',
      objectPath: 'gaep-cat/fotos/01-05-2026_OP_FOTO_1.jpg',
    })
  })

  it('extrai de URL assinada (sign)', () => {
    const url =
      'https://xyzcompany.supabase.co/storage/v1/object/sign/gaep-fotos/pasta/foto.jpg?token=abc'
    expect(parseSupabaseStorageObjectUrl(url)).toEqual({
      bucket: 'gaep-fotos',
      objectPath: 'pasta/foto.jpg',
    })
  })

  it('extrai de URL authenticated', () => {
    const url =
      'https://xyzcompany.supabase.co/storage/v1/object/authenticated/gaep-fotos/x/y.jpg'
    expect(parseSupabaseStorageObjectUrl(url)).toEqual({
      bucket: 'gaep-fotos',
      objectPath: 'x/y.jpg',
    })
  })

  it('extrai de URL render/image (getPublicUrl com transform)', () => {
    const url =
      'https://xyzcompany.supabase.co/storage/v1/render/image/public/gaep-fotos/gaep-cat/fotos/x.jpg?width=200'
    expect(parseSupabaseStorageObjectUrl(url)).toEqual({
      bucket: 'gaep-fotos',
      objectPath: 'gaep-cat/fotos/x.jpg',
    })
  })

  it('retorna null para URL externa', () => {
    expect(parseSupabaseStorageObjectUrl('https://example.com/img.png')).toBeNull()
  })
})
