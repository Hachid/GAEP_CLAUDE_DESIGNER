/* eslint-disable no-console */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { Client } = require('pg')

const projectRoot = path.resolve(__dirname, '..')
const migrationsDir = path.join(projectRoot, 'handoff', 'migrations')
const manifestPath = path.join(migrationsDir, 'manifest.json')
const envPath = path.join(projectRoot, '.env.local')

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Manifest de migrations nao encontrado em handoff/migrations/manifest.json')
  }
  const raw = fs.readFileSync(manifestPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error('Manifest de migrations invalido: campo "files" vazio ou ausente')
  }
  return parsed.files
}

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

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._app_migrations (
      id bigserial PRIMARY KEY,
      file_name text NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `)
}

async function run() {
  loadEnvFile()
  const autoMode = process.argv.includes('--auto')
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

  if (!dbUrl) {
    if (autoMode) {
      console.log('[db:sync] Sem SUPABASE_DB_URL/DATABASE_URL. Pulando sincronizacao automatica.')
      return
    }
    throw new Error(
      'Defina SUPABASE_DB_URL (ou DATABASE_URL) para executar o sync de migrations.'
    )
  }

  const files = readManifest()
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    await ensureMigrationsTable(client)
    const { rows } = await client.query(
      'SELECT file_name, checksum FROM public._app_migrations ORDER BY id ASC'
    )
    const applied = new Map(rows.map((r) => [r.file_name, r.checksum]))
    let appliedNow = 0

    for (const fileName of files) {
      const fullPath = path.join(migrationsDir, fileName)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Arquivo de migration nao encontrado: ${fileName}`)
      }

      const sql = fs.readFileSync(fullPath, 'utf8')
      const checksum = sha256(sql)
      const oldChecksum = applied.get(fileName)

      if (oldChecksum) {
        if (oldChecksum !== checksum) {
          throw new Error(
            `Migration ja aplicada com checksum diferente: ${fileName}. Crie uma nova migration em vez de editar a antiga.`
          )
        }
        continue
      }

      console.log(`[db:sync] Aplicando ${fileName}...`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO public._app_migrations (file_name, checksum) VALUES ($1, $2)',
          [fileName, checksum]
        )
        await client.query('COMMIT')
        appliedNow += 1
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Falha ao aplicar ${fileName}: ${error.message}`)
      }
    }

    if (appliedNow === 0) {
      console.log('[db:sync] Banco ja esta sincronizado.')
    } else {
      console.log(`[db:sync] Sincronizacao concluida. ${appliedNow} migration(s) aplicada(s).`)
    }
  } finally {
    await client.end()
  }
}

run().catch((err) => {
  const autoMode = process.argv.includes('--auto')
  const msg = String(err?.message || '')
  const transientNetworkError =
    msg.includes('ENOTFOUND') ||
    msg.includes('EAI_AGAIN') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENETUNREACH')

  if (autoMode && transientNetworkError) {
    console.warn(`[db:sync] Aviso (modo auto): ${msg}`)
    console.warn(
      '[db:sync] Continuando sem sincronizar agora. Ajuste SUPABASE_DB_URL (preferencialmente Pooler) para sincronizar no startup.'
    )
    process.exit(0)
  }

  console.error('[db:sync] Erro:', msg)
  process.exit(1)
})
