import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDesempenhoData } from '@/app/(app)/operadores/actions'
import { buildDesempenhoOperadorPdfHtml } from '@/lib/pdf/buildDesempenhoOperadorPdfHtml'
import { renderHtmlToPdfBuffer } from '@/lib/pdf/renderRelatorioPdfPlaywright'

export const runtime = 'nodejs'
export const maxDuration = 120

interface OperadorComGaep {
  id: string
  nome_guerra: string
  matricula: string | null
  gaep_id: string
  gaeps: { id: string; nome: string } | null
}

function formatarDataHoraLocal(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function resolverOperadorGaep(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string | undefined
): Promise<OperadorComGaep | null> {
  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id, matricula, gaeps(id, nome:codigo)')
    .eq('auth_id', userId)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (byAuthId) return byAuthId

  const matricula = email?.replace('@gaep.internal', '').trim() ?? ''
  if (!matricula) return null

  const { data: byMatricula } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id, matricula, gaeps(id, nome:codigo)')
    .eq('matricula', matricula)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  return byMatricula ?? null
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w\-]+/g, '_').slice(0, 48) || 'operador'
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const operadorId = (url.searchParams.get('operadorId') ?? '').trim()
  const dataInicio = (url.searchParams.get('dataInicio') ?? '').trim()
  const dataFim = (url.searchParams.get('dataFim') ?? '').trim()
  const download = url.searchParams.get('download') === '1'

  if (!operadorId || !dataInicio || !dataFim) {
    return NextResponse.json(
      { error: 'Informe operadorId, dataInicio e dataFim (YYYY-MM-DD).' },
      { status: 400 }
    )
  }
  if (dataInicio > dataFim) {
    return NextResponse.json({ error: 'dataInicio não pode ser maior que dataFim.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const solicitante = await resolverOperadorGaep(admin, user.id, user.email ?? undefined)
  if (!solicitante?.gaeps) {
    return NextResponse.json({ error: 'Operador não encontrado.' }, { status: 403 })
  }

  const { data: alvo, error: alvoErr } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id')
    .eq('id', operadorId)
    .is('deleted_at', null)
    .maybeSingle<{ id: string; nome_guerra: string; gaep_id: string }>()

  if (alvoErr || !alvo) {
    return NextResponse.json({ error: 'Operador alvo não encontrado.' }, { status: 404 })
  }

  if (alvo.gaep_id !== solicitante.gaep_id) {
    return NextResponse.json({ error: 'Sem permissão para este operador.' }, { status: 403 })
  }

  const result = await fetchDesempenhoData(operadorId, { dataInicio, dataFim })
  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? 'Não foi possível carregar os dados de desempenho.' },
      { status: 400 }
    )
  }

  const gaepCodigoStr = solicitante.gaeps.nome ?? ''
  const nomeOperador = alvo.nome_guerra?.trim() || 'operador'
  const emitidoEm = formatarDataHoraLocal(new Date().toISOString())

  const html = buildDesempenhoOperadorPdfHtml({
    operadorNome: nomeOperador,
    gaepCodigo: gaepCodigoStr,
    dataInicio,
    dataFim,
    kpi: result.data.kpi,
    folha: result.data.folha,
    emitidoEm,
  })

  let buffer: Buffer
  try {
    buffer = await renderHtmlToPdfBuffer(html)
  } catch (e) {
    console.error('[pdf][desempenho-operador]', e)
    return NextResponse.json(
      { error: 'Não foi possível gerar o PDF neste momento. Tente novamente.' },
      { status: 503 }
    )
  }

  const base = `desempenho-${sanitizeFilenamePart(nomeOperador)}-${dataInicio}-${dataFim}`
  const filenamePdf = `${base}.pdf`
  const disposition = download ? `attachment; filename="${filenamePdf}"` : `inline; filename="${filenamePdf}"`

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, no-store',
    },
  })
}
