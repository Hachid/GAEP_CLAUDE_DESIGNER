import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import { MissoesRelatorioClient } from './MissoesRelatorioClient'

interface Props {
  searchParams: Promise<{ pdf?: string | string[] }>
}

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

type MissaoRow = {
  id: string
  operador_id: string
  tipo_snapshot: string
  qtd: number
  valor_unitario_snapshot: number
  valor_total: number
  observacao: string | null
  created_at: string
  updated_at: string | null
  operadores:
    | { nome_guerra: string; numerica: string | null }
    | Array<{ nome_guerra: string; numerica: string | null }>
    | null
}

type PrintMargins = { top: number; right: number; bottom: number; left: number }

export default async function MissoesRelatorioPage({ searchParams }: Props) {
  const sp = await searchParams
  const pdfFlag = sp.pdf
  const autoPrintPdf =
    pdfFlag === '1' ||
    pdfFlag === 'true' ||
    (Array.isArray(pdfFlag) && (pdfFlag.includes('1') || pdfFlag.includes('true')))

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const admin = createAdminClient()
  let operadorAtual: OperadorComGaep | null = null

  const { data: byAuthId } = await admin
    .from('operadores')
    .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (byAuthId) {
    operadorAtual = byAuthId
  } else {
    const matricula = user.email?.replace('@gaep.internal', '').trim() ?? ''
    if (matricula) {
      const { data: byMatricula } = await admin
        .from('operadores')
        .select('id, nome_guerra:nome, gaep_id, matricula, perfil, gaeps(id, nome:codigo)')
        .eq('matricula', matricula)
        .is('deleted_at', null)
        .maybeSingle<OperadorComGaep>()
      if (byMatricula) operadorAtual = byMatricula
    }
  }

  if (!operadorAtual?.gaeps) redirect('/missoes')

  const withLayout = await admin
    .from('config_relatorio')
    .select('titulo_texto, subtitulo_texto, rodape_texto, timbrado_url, layout_pdf')
    .eq('gaep_id', operadorAtual.gaep_id)
    .maybeSingle()
  const fallbackCfg = withLayout.error
    ? await admin
        .from('config_relatorio')
        .select('titulo_texto, subtitulo_texto, rodape_texto, timbrado_url')
        .eq('gaep_id', operadorAtual.gaep_id)
        .maybeSingle()
    : null
  const configRaw = (withLayout.error ? fallbackCfg?.data : withLayout.data) as Record<string, unknown> | null
  const printMargins: PrintMargins = (() => {
    const layout = (configRaw?.layout_pdf as { margins?: Partial<PrintMargins> } | undefined)?.margins
    return {
      top: Number(layout?.top ?? 1.5),
      right: Number(layout?.right ?? 1.5),
      bottom: Number(layout?.bottom ?? 1.5),
      left: Number(layout?.left ?? 1.5),
    }
  })()

  const configRelatorio: ConfigRelatorioUIData = {
    id: null,
    tituloTexto: String(configRaw?.titulo_texto ?? 'RELATÓRIO DE MISSÕES'),
    subtituloTexto: String(configRaw?.subtitulo_texto ?? 'MISSÕES OPERACIONAIS'),
    descricaoTexto: '',
    rodapeTexto: String(configRaw?.rodape_texto ?? '{{GAEP}}'),
    timbradoUrl: configRaw?.timbrado_url ? String(configRaw.timbrado_url) : null,
    tituloEstilo: { fontFamily: 'Times New Roman', fontColor: '#000000', align: 'center', indent: 0, lineHeight: 1.4, fontSize: 12 },
    subtituloEstilo: { fontFamily: 'Times New Roman', fontColor: '#000000', align: 'center', indent: 0, lineHeight: 1.3, fontSize: 11 },
    descricaoEstilo: { fontFamily: 'Times New Roman', fontColor: '#111827', align: 'justify', indent: 12, lineHeight: 1.8, fontSize: 11 },
    rodapeEstilo: { fontFamily: 'Times New Roman', fontColor: '#6b7280', align: 'right', indent: 0, lineHeight: 1.3, fontSize: 8 },
    printMargins,
  }

  const withUpdatedAt = await admin
    .from('missoes')
    .select('id, operador_id, tipo_snapshot, qtd, valor_unitario_snapshot, valor_total, observacao, created_at, updated_at, operadores!missoes_operador_id_fkey(nome_guerra:nome, numerica)')
    .eq('gaep_id', operadorAtual.gaep_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  function normalizeOperador(
    operador: MissaoRow['operadores']
  ): { nome_guerra: string; numerica: string | null } | null {
    if (!operador) return null
    return Array.isArray(operador) ? (operador[0] ?? null) : operador
  }

  let missoesRows: MissaoRow[] = []
  if (!withUpdatedAt.error) {
    missoesRows = (withUpdatedAt.data ?? []) as MissaoRow[]
  } else {
    const fallback = await admin
      .from('missoes')
      .select('id, operador_id, tipo_snapshot, qtd, valor_unitario_snapshot, valor_total, observacao, created_at, operadores!missoes_operador_id_fkey(nome_guerra:nome)')
      .eq('gaep_id', operadorAtual.gaep_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    missoesRows = (
      (fallback.data ?? []) as Array<
        Omit<MissaoRow, 'updated_at' | 'operadores'> & { operadores: { nome_guerra: string } | Array<{ nome_guerra: string }> | null }
      >
    ).map((m) => {
      const op = m.operadores
      const first = Array.isArray(op) ? (op[0] ?? null) : op
      return {
        ...m,
        updated_at: null,
        operadores: first ? { ...first, numerica: null } : null,
      }
    })
  }

  const groupMap = new Map<string, {
    operadorId: string
    operadorNome: string
    operadorNumerica: string | null
    totalMisssoes: number
    totalValor: number
    missoes: Array<{
      id: string
      data: string
      tipo: string
      qtd: number
      valorUnitario: number
      valorTotal: number
      observacao: string | null
    }>
  }>()

  let ultimaAtualizacao: string | null = null
  for (const m of missoesRows) {
    const operador = normalizeOperador(m.operadores)
    const id = String(m.operador_id)
    const existing = groupMap.get(id)
    const dataRef = m.updated_at ?? m.created_at
    if (!ultimaAtualizacao || new Date(dataRef) > new Date(ultimaAtualizacao)) {
      ultimaAtualizacao = dataRef
    }
    if (existing) {
      existing.totalMisssoes += 1
      existing.totalValor += Number(m.valor_total)
      existing.missoes.push({
        id: m.id,
        data: m.created_at,
        tipo: m.tipo_snapshot,
        qtd: Number(m.qtd),
        valorUnitario: Number(m.valor_unitario_snapshot),
        valorTotal: Number(m.valor_total),
        observacao: m.observacao,
      })
    } else {
      groupMap.set(id, {
        operadorId: id,
        operadorNome: operador?.nome_guerra ?? '—',
        operadorNumerica: operador?.numerica ?? null,
        totalMisssoes: 1,
        totalValor: Number(m.valor_total),
        missoes: [{
          id: m.id,
          data: m.created_at,
          tipo: m.tipo_snapshot,
          qtd: Number(m.qtd),
          valorUnitario: Number(m.valor_unitario_snapshot),
          valorTotal: Number(m.valor_total),
          observacao: m.observacao,
        }],
      })
    }
  }

  const operadores = [...groupMap.values()].sort((a, b) => a.totalValor - b.totalValor)

  return (
    <main style={{ minHeight: '100vh', background: '#f3f4f6', padding: '74px 16px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <MissoesRelatorioClient
          gaepCodigo={operadorAtual.gaeps.nome}
          geradoEm={new Date().toISOString()}
          ultimaAtualizacao={ultimaAtualizacao}
          configRelatorio={{
            tituloTexto: configRelatorio.tituloTexto || 'RELATÓRIO DE MISSÕES',
            subtituloTexto: 'RELATÓRIO CONSOLIDADO DE MISSÕES',
            rodapeTexto: configRelatorio.rodapeTexto || '{{GAEP}}',
            timbradoUrl: configRelatorio.timbradoUrl,
            printMargins,
          }}
          operadores={operadores}
          autoPrintPdf={autoPrintPdf}
        />
      </div>
    </main>
  )
}
