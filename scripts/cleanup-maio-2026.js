/* eslint-disable no-console */
/**
 * Soft-delete de relatórios e missões com data em maio/2026 (YYYY-MM entre 2026-05-01 e 2026-05-31).
 * Requer SUPABASE_DB_URL ou DATABASE_URL no .env.local (mesmo padrão de scripts/sync-db.js).
 */
const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env.local')

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

async function run() {
  loadEnvFile()
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('Defina SUPABASE_DB_URL ou DATABASE_URL no .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const rel = await client.query(
      `UPDATE public.relatorios
       SET deleted_at = now(), updated_at = now()
       WHERE deleted_at IS NULL
         AND data >= DATE '2026-05-01'
         AND data < DATE '2026-06-01'
       RETURNING id`
    )
    const mis = await client.query(
      `UPDATE public.missoes
       SET deleted_at = now()
       WHERE deleted_at IS NULL
         AND data_missao >= DATE '2026-05-01'
         AND data_missao < DATE '2026-06-01'
       RETURNING id`
    )
    console.log(`[cleanup-maio-2026] Relatórios soft-deleted: ${rel.rowCount}`)
    console.log(`[cleanup-maio-2026] Missões soft-deleted: ${mis.rowCount}`)
  } finally {
    await client.end()
  }
}

run().catch((e) => {
  console.error('[cleanup-maio-2026]', e?.message || e)
  process.exit(1)
})
