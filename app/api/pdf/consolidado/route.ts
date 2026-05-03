import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchKPIData, fetchEvolucao, fetchRelatoriosParaConsolidadoPdf } from '@/app/(app)/dashboard/actions'
import type { DashboardFiltros } from '@/app/(app)/dashboard/types'
import { getCategorias, getAtividades } from '@/lib/cache/queries'
import { configRelatorioFromRow } from '@/lib/pdf/configRelatorioFromRow'
import { buildConsolidadoPdfHtml } from '@/lib/pdf/buildConsolidadoPdfHtml'
import { consolidadoIntegrityParts } from '@/lib/pdf/consolidadoIntegrity'
import { normalizeFotosUrls } from '@/lib/pdf/normalizeFotosUrls'
import { fotoBufferToPdfDataUrl, resolveImageToBuffer } from '@/lib/pdf/imageDataUrlForPdf'
import { resolveTimbradoDataUrlForPdf } from '@/lib/pdf/resolveTimbradoForPdf'
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

function renderRodape(texto: string, gaepCodigo: string): string {
  return texto.replaceAll('{{GAEP}}', gaepCodigo).replaceAll('{{VERSAO}}', 'Consolidado')
}

function fmtDataBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
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

function filtrarEvolucaoPorPeriodo(
  ev: Awaited<ReturnType<typeof fetchEvolucao>>,
  dataInicio: string,
  dataFim: string
) {
  const mi = dataInicio.slice(0, 7)
  const mf = dataFim.slice(0, 7)
  return ev.filter((e) => e.mes >= mi && e.mes <= mf)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const dataInicio = (url.searchParams.get('dataInicio') ?? '').trim()
  const dataFim = (url.searchParams.get('dataFim') ?? '').trim()
  const categoriaId = (url.searchParams.get('categoriaId') ?? '').trim()
  const atividadeId = (url.searchParams.get('atividadeId') ?? '').trim()

  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Informe dataInicio e dataFim (YYYY-MM-DD).' }, { status: 400 })
  }
  if (dataInicio > dataFim) {
    return NextResponse.json({ error: 'dataInicio não pode ser maior que dataFim.' }, { status: 400 })
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[PDF][consolidado] sob demanda', { dataInicio, dataFim, categoriaId, atividadeId })
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

  const gaepId = operador.gaep_id
  const gaepCodigoStr = operador.gaeps.nome ?? ''
  const consolidadorNome =
    operador.nome_guerra?.trim() || operador.matricula?.trim() || 'Não informado'

  const filtros: DashboardFiltros = {
    dataInicio,
    dataFim,
    categoriaId,
    atividadeId,
  }

  const [categorias, atividades, kpi, evolucaoFull, relatorios, withLayout] = await Promise.all([
    getCategorias(),
    getAtividades(),
    fetchKPIData(gaepId, filtros),
    fetchEvolucao(gaepId),
    fetchRelatoriosParaConsolidadoPdf(gaepId, filtros),
    admin
      .from('config_relatorio')
      .select(
        'id, titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url, layout_pdf'
      )
      .eq('gaep_id', gaepId)
      .maybeSingle(),
  ])

  const labelCategoria = categoriaId
    ? categorias.find((c) => c.id === categoriaId)?.nome ?? 'Todas'
    : 'Todas'
  const labelAtividade = atividadeId
    ? atividades.find((a) => a.id === atividadeId)?.nome ?? 'Todas'
    : 'Todas'

  const fallbackCfg = withLayout.error
    ? await admin
        .from('config_relatorio')
        .select(
          'titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url'
        )
        .eq('gaep_id', gaepId)
        .maybeSingle()
    : null
  const cfgRow = (withLayout.error ? fallbackCfg?.data : withLayout.data) as Record<string, unknown> | null
  const config = configRelatorioFromRow(cfgRow)

  const evolucaoFiltrada = filtrarEvolucaoPorPeriodo(evolucaoFull, dataInicio, dataFim)

  const emitidoAgora = formatarDataHoraLocal(new Date().toISOString())
  const relatorioIds = relatorios.map((r) => r.id)
  const { hash, qrPayload } = consolidadoIntegrityParts({
    gaepId,
    dataInicio,
    dataFim,
    categoriaId,
    atividadeId,
    relatorioIdsOrdenados: relatorioIds,
    emitidoAtIso: new Date().toISOString(),
    consolidadorNome,
  })

  const QRCode = (await import('qrcode')).default
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 180,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const timbradoUrl = config.timbradoUrl
  const timbradoDataUrl = await resolveTimbradoDataUrlForPdf(admin, timbradoUrl)

  const fotosComLegenda: Array<{ dataUrl: string; legenda: string }> = []
  for (const rel of relatorios) {
    const urls = normalizeFotosUrls(rel.fotos_urls)
    const cat = rel.categoriaNome ?? '—'
    const legBase = rel.atividadeNome?.trim() || 'Sem legenda'
    for (const u of urls) {
      try {
        const got = await resolveImageToBuffer(admin, u)
        if (!got) continue
        const dataUrl = await fotoBufferToPdfDataUrl(got.buf, got.contentType)
        if (!dataUrl.startsWith('data:image/')) continue
        const legenda = `${fmtDataBr(rel.data)} · ${cat} · ${legBase}`
        fotosComLegenda.push({ dataUrl, legenda })
      } catch {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PDF][consolidado] foto ignorada:', u?.slice(0, 80))
        }
      }
    }
  }

  const rodapeRender = renderRodape(config.rodapeTexto, gaepCodigoStr).trim()
  const rodapeExtraConsolidado =
    rodapeRender && rodapeRender !== gaepCodigoStr.trim() ? rodapeRender : ''

  const html = buildConsolidadoPdfHtml({
    config,
    gaepCodigo: gaepCodigoStr,
    dataInicio,
    dataFim,
    labelCategoria,
    labelAtividade,
    relatorios,
    kpi,
    evolucaoMeses: evolucaoFiltrada,
    fotosComLegenda,
    timbradoDataUrl,
    hash,
    qrDataUrl,
    emitidoEm: emitidoAgora,
    consolidadorNome,
    rodapeTextoRenderizado: rodapeExtraConsolidado,
  })

  let buffer: Buffer
  try {
    buffer = await renderHtmlToPdfBuffer(html)
  } catch (e) {
    console.error('[pdf][consolidado]', e)
    return NextResponse.json(
      { error: 'Não foi possível gerar o consolidado neste momento. Tente novamente.' },
      { status: 503 }
    )
  }

  const filenamePdf = `consolidado-${dataInicio}-${dataFim}.pdf`
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filenamePdf}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
