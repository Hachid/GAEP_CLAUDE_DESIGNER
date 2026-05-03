import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buscarRelatorio } from '@/app/relatorio/actions'
import { relatorioIntegrityParts } from '@/lib/pdf/relatorioIntegrity'
import { configRelatorioFromRow } from '@/lib/pdf/configRelatorioFromRow'
import { buildRelatorioPdfHtml } from '@/lib/pdf/buildRelatorioPdfHtml'
import { fotoBufferToPdfDataUrl, resolveImageToBuffer } from '@/lib/pdf/imageDataUrlForPdf'
import { normalizeFotosUrls } from '@/lib/pdf/normalizeFotosUrls'
import { resolveTimbradoDataUrlForPdf } from '@/lib/pdf/resolveTimbradoForPdf'
import { renderHtmlToPdfBuffer } from '@/lib/pdf/renderRelatorioPdfPlaywright'

export const runtime = 'nodejs'

/** Geração com Chromium + cold start do binário serverless pode passar de 10s. */
export const maxDuration = 60

const tracePdfFotos = process.env.NODE_ENV !== 'production'

interface OperadorComGaep {
  id: string
  gaep_id: string
  gaeps: { id: string; nome: string } | null
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarHora(hora: string | null): string {
  if (!hora) return '--:--'
  return hora.slice(0, 5)
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

function renderRodape(texto: string, gaepCodigo: string, versao: number): string {
  return texto.replaceAll('{{GAEP}}', gaepCodigo).replaceAll('{{VERSAO}}', String(versao))
}

async function resolverOperadorGaep(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string | undefined
): Promise<OperadorComGaep | null> {
  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, gaep_id, gaeps(id, nome:codigo)')
    .eq('auth_id', userId)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (byAuthId) return byAuthId

  const matricula = email?.replace('@gaep.internal', '').trim() ?? ''
  if (!matricula) return null

  const { data: byMatricula } = await admin
    .from('operadores')
    .select('id, gaep_id, gaeps(id, nome:codigo)')
    .eq('matricula', matricula)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  return byMatricula ?? null
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const shouldDownload = new URL(req.url).searchParams.get('download') === '1'
  const tracePerf = process.env.NODE_ENV !== 'production'
  const t0 = tracePerf ? Date.now() : 0
  if (tracePerf) console.log('[PDF][perf] start', id)
  if (process.env.NODE_ENV === 'development') {
    console.log('[PDF][on-demand] gerando PDF sob demanda:', id)
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
  const operador = await resolverOperadorGaep(admin, user.id, user.email ?? undefined)
  if (!operador?.gaeps) {
    return NextResponse.json({ error: 'Operador não encontrado.' }, { status: 403 })
  }

  const bundle = await buscarRelatorio(id)
  if (bundle.error || !bundle.data) {
    return NextResponse.json({ error: bundle.error ?? 'Relatório não encontrado.' }, { status: 404 })
  }
  if (tracePerf) console.log('[PDF][perf] after report:', Date.now() - t0)

  const rel = bundle.data
  if (rel.gaep_id !== operador.gaep_id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const withLayout = await admin
    .from('config_relatorio')
    .select(
      'id, titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url, layout_pdf'
    )
    .eq('gaep_id', operador.gaep_id)
    .maybeSingle()

  const fallbackCfg = withLayout.error
    ? await admin
        .from('config_relatorio')
        .select(
          'titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url'
        )
        .eq('gaep_id', operador.gaep_id)
        .maybeSingle()
    : null

  const cfgRow = (withLayout.error ? fallbackCfg?.data : withLayout.data) as Record<string, unknown> | null
  const config = configRelatorioFromRow(cfgRow)

  const categoriaNome = rel.categoria_nome ?? ''
  const atividadeNome = rel.atividade_nome ?? ''
  const gaepCodigoStr = operador.gaeps.nome ?? ''
  const subtituloLinha = (() => {
    const sub = config.subtituloTexto.trim()
    const hasPlaceholder =
      sub.includes('{{CATEGORIA}}') || sub.includes('{{ATIVIDADE}}') || sub.includes('{{GAEP}}')
    if (hasPlaceholder) {
      const replaced = sub
        .replaceAll('{{CATEGORIA}}', categoriaNome || 'Não informado')
        .replaceAll('{{ATIVIDADE}}', atividadeNome || 'Não informado')
        .replaceAll('{{GAEP}}', gaepCodigoStr || 'Não informado')
        .trim()
      return replaced || 'RELATÓRIO OPERACIONAL'
    }
    const joined = [categoriaNome, atividadeNome].filter(Boolean).join(' — ')
    return joined || sub || 'RELATÓRIO OPERACIONAL'
  })()

  const descricaoPrefix = config.descricaoTexto.trim()
    ? `${config.descricaoTexto.trim()}\n\n`
    : ''

  const dataFmt = formatarData(rel.data)
  const temHorario = Boolean(rel.hora_inicio && rel.hora_fim)
  const periodoLegenda = temHorario
    ? `${formatarHora(rel.hora_inicio)} às ${formatarHora(rel.hora_fim)}`
    : 'Não informado'
  const duracaoLegenda =
    rel.horas_totais != null && Number.isFinite(Number(rel.horas_totais)) && Number(rel.horas_totais) >= 0
      ? `${rel.horas_totais}h`
      : 'Não informado'
  const dataLegenda = dataFmt.trim() ? dataFmt : 'Não informado'
  const categoriaLegenda = categoriaNome.trim() ? categoriaNome : 'Não informado'
  const atividadeLegenda = atividadeNome.trim() ? atividadeNome : 'Não informado'
  const operadoresStr = rel.participantes.map((p) => p.nome).join(', ')

  const { hash, qrPayload } = relatorioIntegrityParts({
    id: rel.id,
    dataAtividade: rel.data,
    descricaoFinal: rel.descricao_revisada,
    createdAtIso: rel.created_at,
  })

  const QRCode = (await import('qrcode')).default
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 180,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const timbradoUrl = config.timbradoUrl
  const fotosUrls = normalizeFotosUrls(rel.fotos_urls)
  const fotosSlice = fotosUrls.slice(0, 3)

  const [timbradoDataUrl, fotoDataUrls] = await Promise.all([
    resolveTimbradoDataUrlForPdf(admin, timbradoUrl),
    Promise.all(
      fotosSlice.map(async (url, index) => {
        if (tracePdfFotos) {
          console.log('[PDF][fotos] resolving index:', index, 'url/path:', url)
        }
        const got = await resolveImageToBuffer(admin, url)
        if (!got) {
          const preview = url.length > 120 ? `${url.slice(0, 120)}…` : url
          console.warn('[pdf] Foto não resolvida (URL ou Storage):', preview)
          return null
        }
        const dataUrl = await fotoBufferToPdfDataUrl(got.buf, got.contentType)
        if (tracePdfFotos) {
          console.log('[PDF][fotos] resolved buffer size:', got.buf?.length)
          console.log('[PDF][fotos] dataUrl starts with:', dataUrl?.slice(0, 40))
        }
        return dataUrl
      })
    ).then((xs) => xs.filter((x): x is string => Boolean(x))),
  ])

  if (tracePdfFotos) {
    console.log('[PDF][fotos] relatorio id:', id)
    console.log('[PDF][fotos] raw fotos_urls:', rel.fotos_urls)
    console.log('[PDF][fotos] normalized:', fotosUrls)
    console.log('[PDF][fotos] fotoDataUrls count:', fotoDataUrls.length)
    console.log('[PDF][fotos] first fotoDataUrl starts:', fotoDataUrls[0]?.slice(0, 60))
  }
  if (tracePerf) console.log('[PDF][perf] after photos:', Date.now() - t0)

  const fotoDataUrlsPdf = fotoDataUrls.filter(
    (x): x is string => typeof x === 'string' && x.startsWith('data:image/')
  )

  const emitidoAgora = formatarDataHoraLocal(new Date().toISOString())
  const rodapeRender = renderRodape(config.rodapeTexto, operador.gaeps.nome, rel.versao)

  if (tracePdfFotos) {
    console.log('[PDF][fotos] sending to builder count:', fotoDataUrlsPdf.length)
  }

  const html = buildRelatorioPdfHtml({
    config,
    subtituloLinha,
    dataLegenda,
    periodoLegenda,
    duracaoLegenda,
    categoriaLegenda,
    atividadeLegenda,
    operadoresStr,
    outrosIntegrantes: rel.outros_integrantes,
    relatoristaNome: rel.relatorista_nome,
    descricaoPrefix,
    descricao: rel.descricao_revisada,
    ocorrencias: rel.ocorrencias,
    fotoDataUrls: fotoDataUrlsPdf,
    emitidoEm: emitidoAgora,
    versao: rel.versao,
    rodapeTextoRenderizado: rodapeRender,
    timbradoDataUrl,
    hash,
    qrDataUrl,
  })

  if (process.env.NODE_ENV === 'development') {
    try {
      const outDir = path.join(process.cwd(), '.tmp')
      await mkdir(outDir, { recursive: true })
      await writeFile(path.join(outDir, 'debug-relatorio-pdf.html'), html, 'utf8')
    } catch {
      /* debug opcional */
    }
  }
  if (tracePerf) console.log('[PDF][perf] after html:', Date.now() - t0)

  let buffer: Buffer
  try {
    buffer = await renderHtmlToPdfBuffer(html)
  } catch (e) {
    console.error('[pdf]', e)
    return NextResponse.json(
      {
        error:
          'Não foi possível gerar o relatório neste momento. Verifique os dados preenchidos e tente novamente.',
      },
      { status: 503 }
    )
  }
  if (tracePerf) console.log('[PDF][perf] after pdf:', Date.now() - t0)

  const filenamePdf = `relatorio-${id}.pdf`
  const disposition = shouldDownload
    ? `attachment; filename="${filenamePdf}"`
    : `inline; filename="${filenamePdf}"`

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, no-store',
    },
  })
}
