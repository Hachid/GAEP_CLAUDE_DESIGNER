import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { buscarRelatorio } from '../actions'
import { RelatorioDetalheClient } from './RelatorioDetalheClient'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'

interface OperadorComGaep {
  id: string
  nome_guerra: string
  gaep_id: string
  matricula: string
  perfil: string
  gaeps: { id: string; nome: string } | null
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pdf?: string | string[] }>
}

export default async function RelatorioDetalhePage({ params, searchParams }: Props) {
  const { id } = await params
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

  if (!operadorAtual?.gaeps) redirect('/relatorio')

  const { data: relatorio, error } = await buscarRelatorio(id)

  if (error || !relatorio) notFound()

  const withLayout = await admin
    .from('config_relatorio')
    .select('titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url, layout_pdf')
    .eq('gaep_id', operadorAtual.gaep_id)
    .maybeSingle()
  const fallbackCfg = withLayout.error
    ? await admin
        .from('config_relatorio')
        .select('titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url')
        .eq('gaep_id', operadorAtual.gaep_id)
        .maybeSingle()
    : null
  const relatorioCfg = (withLayout.error ? fallbackCfg?.data : withLayout.data) as Record<string, unknown> | null

  const configRelatorio: ConfigRelatorioUIData = relatorioCfg
    ? {
        id: null,
        tituloTexto: String(relatorioCfg.titulo_texto ?? 'RELATÓRIO OPERACIONAL'),
        subtituloTexto: String(relatorioCfg.subtitulo_texto ?? 'RELATÓRIO DE ATIVIDADE(S)'),
        descricaoTexto: String(relatorioCfg.descricao_texto ?? ''),
        rodapeTexto: String(relatorioCfg.rodape_texto ?? '{{GAEP}}'),
        timbradoUrl: relatorioCfg.timbrado_url ? String(relatorioCfg.timbrado_url) : null,
        tituloEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#000000',
          align: 'center',
          indent: 0,
          lineHeight: 1.4,
          fontSize: 12,
          ...(relatorioCfg.titulo_estilo as Record<string, unknown>),
        } as ConfigRelatorioUIData['tituloEstilo'],
        subtituloEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#000000',
          align: 'center',
          indent: 0,
          lineHeight: 1.3,
          fontSize: 11,
          ...(relatorioCfg.subtitulo_estilo as Record<string, unknown>),
        } as ConfigRelatorioUIData['subtituloEstilo'],
        descricaoEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#111827',
          align: 'justify',
          indent: 12,
          lineHeight: 1.8,
          fontSize: 11,
          ...(relatorioCfg.descricao_estilo as Record<string, unknown>),
        } as ConfigRelatorioUIData['descricaoEstilo'],
        rodapeEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#6b7280',
          align: 'right',
          indent: 0,
          lineHeight: 1.3,
          fontSize: 8,
          ...(relatorioCfg.rodape_estilo as Record<string, unknown>),
        } as ConfigRelatorioUIData['rodapeEstilo'],
        printMargins: (() => {
          const layout = relatorioCfg.layout_pdf as
            | { margins?: { top?: number; right?: number; bottom?: number; left?: number } }
            | undefined
          const m = layout?.margins
          return {
            top: Number(m?.top ?? 1.5),
            right: Number(m?.right ?? 1.5),
            bottom: Number(m?.bottom ?? 1.5),
            left: Number(m?.left ?? 1.5),
          }
        })(),
      }
    : {
        id: null,
        tituloTexto: 'RELATÓRIO OPERACIONAL',
        subtituloTexto: 'RELATÓRIO DE ATIVIDADE(S)',
        descricaoTexto: '',
        rodapeTexto: '{{GAEP}}',
        timbradoUrl: null,
        tituloEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#000000',
          align: 'center',
          indent: 0,
          lineHeight: 1.4,
          fontSize: 12,
        },
        subtituloEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#000000',
          align: 'center',
          indent: 0,
          lineHeight: 1.3,
          fontSize: 11,
        },
        descricaoEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#111827',
          align: 'justify',
          indent: 12,
          lineHeight: 1.8,
          fontSize: 11,
        },
        rodapeEstilo: {
          fontFamily: 'Times New Roman',
          fontColor: '#6b7280',
          align: 'right',
          indent: 0,
          lineHeight: 1.3,
          fontSize: 8,
        },
        printMargins: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
      }

  return (
    <>
      <SidebarNav
        nome={operadorAtual.nome_guerra}
        gaepCodigo={operadorAtual.gaeps.nome}
        perfil={operadorAtual.perfil ?? 'OPERADOR'}
      />
      <main style={{ minHeight: '100vh', background: '#f3f4f6', padding: '74px 16px 20px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          <RelatorioDetalheClient
            relatorio={relatorio}
            perfil={operadorAtual.perfil ?? 'OPERADOR'}
            operadorId={operadorAtual.id}
            gaepCodigo={operadorAtual.gaeps.nome}
            configRelatorio={configRelatorio}
            autoPrintPdf={autoPrintPdf}
          />
        </div>
      </main>
    </>
  )
}
