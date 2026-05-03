import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { buscarRelatorio } from '../actions'
import { RelatorioDetalheClient } from './RelatorioDetalheClient'
import type { ConfigRelatorioUIData } from '@/app/(app)/gestao/GestaoClient'
import { relatorioIntegrityParts } from '@/lib/pdf/relatorioIntegrity'
import { configRelatorioFromRow } from '@/lib/pdf/configRelatorioFromRow'

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
}

export default async function RelatorioDetalhePage({ params }: Props) {
  const { id } = await params

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

  const [relatorioBundle, withLayout] = await Promise.all([
    buscarRelatorio(id),
    admin
      .from('config_relatorio')
      .select(
        'titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url, layout_pdf'
      )
      .eq('gaep_id', operadorAtual.gaep_id)
      .maybeSingle(),
  ])

  const { data: relatorio, error } = relatorioBundle
  if (error || !relatorio) notFound()

  const fallbackCfg = withLayout.error
    ? await admin
        .from('config_relatorio')
        .select('titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url')
        .eq('gaep_id', operadorAtual.gaep_id)
        .maybeSingle()
    : null
  const relatorioCfg = (withLayout.error ? fallbackCfg?.data : withLayout.data) as Record<string, unknown> | null

  const integrity = relatorioIntegrityParts({
    id: relatorio.id,
    dataAtividade: relatorio.data,
    descricaoFinal: relatorio.descricao_revisada,
    createdAtIso: relatorio.created_at,
  })

  const configRelatorio: ConfigRelatorioUIData = configRelatorioFromRow(relatorioCfg)

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
            integrity={integrity}
          />
        </div>
      </main>
    </>
  )
}
