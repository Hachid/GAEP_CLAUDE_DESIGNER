const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function readEnv(path) {
  const raw = fs.readFileSync(path, 'utf8')
  const pairs = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf('=')
      if (idx <= 0) return null
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
    .filter(Boolean)
  return Object.fromEntries(pairs)
}

async function main() {
  const env = readEnv('.env.local')
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const matriculas = [
    '235659',
    '235963',
    '2134560',
    '1774386',
    '1511953',
    '1773996',
    '1773860',
    '1546182',
    '2358541',
    '3124074',
    '3294977',
  ]

  const { data: gaep, error: gaepError } = await supabase
    .from('gaeps')
    .select('id, codigo')
    .eq('codigo', 'GAEP-CAT')
    .maybeSingle()

  if (gaepError || !gaep) {
    throw gaepError || new Error('GAEP-CAT not found')
  }

  let created = 0
  let already = 0
  let linked = 0
  let linkFail = 0

  const { data: usersPage, error: usersPageError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (usersPageError) throw usersPageError

  const usersByEmail = new Map(
    (usersPage.users ?? []).map((u) => [(u.email ?? '').toLowerCase(), u.id])
  )

  for (const matricula of matriculas) {
    const email = `${matricula}@gaep.internal`
    let userId = usersByEmail.get(email.toLowerCase()) ?? null

    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: matricula,
        email_confirm: true,
      })

      if (createError) {
        console.log(`CREATE_FAIL ${matricula}: ${createError.message}`)
        continue
      }

      created += 1
      userId = newUser.user?.id ?? null
      if (userId) usersByEmail.set(email.toLowerCase(), userId)
    } else {
      already += 1
    }

    if (!userId) {
      console.log(`NO_USER_ID ${matricula}`)
      continue
    }

    const { error: updateError } = await supabase
      .from('operadores')
      .update({ auth_id: userId })
      .eq('matricula', matricula)
      .eq('gaep_id', gaep.id)

    if (updateError) {
      linkFail += 1
      console.log(`LINK_FAIL ${matricula}: ${updateError.message}`)
    } else {
      linked += 1
    }
  }

  const { data: checkRows, error: checkError } = await supabase
    .from('operadores')
    .select('matricula, nome, auth_id')
    .eq('gaep_id', gaep.id)
    .in('matricula', matriculas)
    .order('nome')

  if (checkError) throw checkError

  const semAuthId = (checkRows ?? []).filter((r) => !r.auth_id).map((r) => r.matricula)

  console.log(
    JSON.stringify(
      {
        gaep_id: gaep.id,
        created,
        already,
        linked,
        linkFail,
        total_rows_checked: (checkRows ?? []).length,
        sem_auth_id: semAuthId,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
