import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveImageToBuffer, timbradoBufferToPdfDataUrl } from '@/lib/pdf/imageDataUrlForPdf'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

const OFFICIAL_REL_PATH = ['public', 'gaep-cat-header-v1.png'] as const

/**
 * Timbrado do PDF: prioriza o arquivo oficial no repositório (`public/gaep-cat-header-v1.png`);
 * se não existir, usa `timbradoUrl` da Gestão (Storage / data URL).
 */
export async function resolveTimbradoDataUrlForPdf(
  admin: Admin,
  timbradoUrlFromConfig: string | null
): Promise<string | null> {
  const officialPath = path.join(process.cwd(), ...OFFICIAL_REL_PATH)
  try {
    const buf = await readFile(officialPath)
    return timbradoBufferToPdfDataUrl(buf, 'image/png')
  } catch {
    /* arquivo não versionado no deploy — segue para config */
  }

  if (!timbradoUrlFromConfig?.trim()) return null
  const got = await resolveImageToBuffer(admin, timbradoUrlFromConfig)
  if (!got) return null
  return timbradoBufferToPdfDataUrl(got.buf, got.contentType)
}
