import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GestaoClient } from './GestaoClient'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { logAudit } from '@/lib/audit'
import { getCategorias, getAtividades } from '@/lib/cache/queries'
import type {
  GestaoData,
  OperadorRow,
  AtividadeRow,
  FeriadoRow,
  DiasUteisMesRow,
  DiariaRow,
  GaepRow,
  ConfigRelatorioUIData,
} from './GestaoClient'
import {
  DEFAULT_TITULO_RELATORIO_INSTITUCIONAL,
  resolveTituloRelatorioFromDb,
} from '@/lib/pdf/defaultTituloRelatorio'
import { DEFAULT_PRINT_MARGINS_MM } from '@/lib/pdf/relatorioIntegrity'

export default async function GestaoPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const authUserId = user.id
  const admin = createAdminClient()

  async function carregarConfigRelatorio(gaepId: string) {
    const withLayout = await admin
      .from('config_relatorio')
      .select(
        'id, titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url, layout_pdf'
      )
      .eq('gaep_id', gaepId)
      .maybeSingle()
    if (!withLayout.error) return withLayout
    return admin
      .from('config_relatorio')
      .select(
        'id, titulo_texto, subtitulo_texto, descricao_texto, rodape_texto, titulo_estilo, subtitulo_estilo, descricao_estilo, rodape_estilo, timbrado_url'
      )
      .eq('gaep_id', gaepId)
      .maybeSingle()
  }

  // ── 2. Operador atual + perfil ────────────────────────────────
  interface OperadorComGaep {
    id: string
    nome: string
    perfil: string
    gaep_id: string
    gaeps: { id: string; codigo: string; cidade: string; estado: string } | null
  }

  const { data: operador } = await admin
    .from('operadores')
    .select('id, nome, perfil, gaep_id, gaeps(id, codigo, cidade, estado)')
    .eq('auth_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (!operador) redirect('/relatorio')

  const perfil = String(operador.perfil)
  const isGestaoAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)

  const gaep = operador.gaeps
  if (!gaep) redirect('/relatorio')

  const resolvedParams = searchParams ? await searchParams : {}
  const tabParam = resolvedParams.tab

  if (tabParam === 'gaeps' && perfil !== 'SUPER_ADMIN') {
    redirect('/gestao?tab=efetivo')
  }

  if (!isGestaoAdmin && tabParam !== 'dados-pessoais') {
    redirect('/gestao?tab=dados-pessoais')
  }

  async function fetchOperadorPessoalRow(): Promise<OperadorRow | null> {
    const withExtras = await admin
      .from('operadores')
      .select(
        'id, nome, nome_completo, matricula, perfil, equipe, ativo, email_funcional, numerica, tipo_sanguineo, alergia, contato_emergencia, nome_contato_emergencia, plano_saude, numero_carteirinha, cpf, email'
      )
      .eq('auth_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!withExtras.error && withExtras.data) {
      return withExtras.data as OperadorRow
    }

    const fallback = await admin
      .from('operadores')
      .select('id, nome, matricula, perfil, equipe, ativo, email_funcional')
      .eq('auth_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fallback.error || !fallback.data) return null

    const o = fallback.data as {
      id: string
      nome: string
      matricula: string
      perfil: string
      equipe: string | null
      ativo: boolean
      email_funcional: string | null
    }

    return {
      ...o,
      nome_completo: null,
      numerica: null,
      tipo_sanguineo: null,
      alergia: null,
      contato_emergencia: null,
      nome_contato_emergencia: null,
      plano_saude: null,
      numero_carteirinha: null,
      cpf: null,
      email: null,
    }
  }

  const operadorPessoal = await fetchOperadorPessoalRow()
  if (!operadorPessoal) redirect('/relatorio')

  async function listarOperadoresGestao(gaepId: string) {
    const withExtras = await admin
      .from('operadores')
      .select(
        'id, nome, nome_completo, matricula, perfil, equipe, ativo, email_funcional, numerica, tipo_sanguineo, alergia, contato_emergencia, nome_contato_emergencia, plano_saude, numero_carteirinha, cpf, email'
      )
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)
      .order('nome')

    if (!withExtras.error) {
      return (withExtras.data ?? []) as OperadorRow[]
    }

    const fallback = await admin
      .from('operadores')
      .select('id, nome, matricula, perfil, equipe, ativo, email_funcional')
      .eq('gaep_id', gaepId)
      .is('deleted_at', null)
      .order('nome')

    return ((fallback.data ?? []) as Array<{
      id: string
      nome: string
      matricula: string
      perfil: string
      equipe: string | null
      ativo: boolean
      email_funcional: string | null
    }>).map((o) => ({
      ...o,
      numerica: null,
      nome_completo: null,
      tipo_sanguineo: null,
      alergia: null,
      contato_emergencia: null,
      nome_contato_emergencia: null,
      plano_saude: null,
      numero_carteirinha: null,
      cpf: null,
      email: null,
    }))
  }

  if (!isGestaoAdmin) {
    const dataSelf: GestaoData = {
      gestaoModo: 'self-only',
      operadorPessoal,
      operadorAtual: { id: operador.id, nome: String(operador.nome), perfil },
      gaep,
      operadores: [],
      categorias: [],
      atividades: [],
      feriados: [],
      diasUteisMes: [],
      configIA: {
        id: null,
        modelo: 'gpt-4o',
        temperatura: 0.3,
        prompt:
          'Você é um assistente oficial do GAEP. Redija descrições formais de atividades operacionais com base nos dados informados. Mantenha linguagem técnica e institucional.',
      },
      configRelatorio: {
        id: null,
        tituloTexto: DEFAULT_TITULO_RELATORIO_INSTITUCIONAL,
        subtituloTexto: '',
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
        printMargins: { ...DEFAULT_PRINT_MARGINS_MM },
      },
      diarias: [],
      gaeps: [],
    }

    logAudit({
      gaepId: gaep.id,
      operadorId: operador.id,
      acao: 'ACESSO',
      tabela: 'gestao',
      dadosDepois: { tab: 'dados-pessoais', perfil },
    }).catch(() => {})

    return (
      <>
        <SidebarNav nome={operador.nome} gaepCodigo={gaep.codigo} perfil={perfil} />
        <main
          style={{
            minHeight: '100vh',
            background: '#f3f4f6',
            padding: '74px 16px 20px',
          }}
        >
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div
              style={{
                textAlign: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#1a237e',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: 14,
                marginBottom: 22,
                letterSpacing: 0.3,
              }}
            >
              GESTÃO
            </div>
            <GestaoClient data={dataSelf} />
          </div>
        </main>
      </>
    )
  }

  // ── 3. Busca de dados em paralelo ─────────────────────────────
  const [opsData, categorias, atividades, ferRes, diasUteisRes, iaRes, relatorioCfgRes, diarRes, gaepsRes] = await Promise.all([
    listarOperadoresGestao(gaep.id),
    getCategorias(),
    getAtividades(),

    admin
      .from('feriados')
      .select('id, data, descricao')
      .eq('gaep_id', gaep.id)
      .order('data'),

    admin
      .from('gaep_dias_uteis')
      .select('id, referencia_mes, dias_uteis')
      .eq('gaep_id', gaep.id)
      .order('referencia_mes', { ascending: false }),

    admin
      .from('config_ia')
      .select('id, modelo, temperatura, prompt')
      .eq('gaep_id', gaep.id)
      .maybeSingle(),

    carregarConfigRelatorio(gaep.id),

    admin.from('tipos_missao').select('id, tipo, locais, valor, vigencia').order('tipo'),

    perfil === 'SUPER_ADMIN'
      ? admin
          .from('gaeps')
          .select('id, codigo, cidade, estado, ativo')
          .is('deleted_at', null)
          .order('codigo')
      : Promise.resolve({ data: [] as GaepRow[], error: null }),
  ])

  // ── 4. Montar GestaoData ──────────────────────────────────────
  const data: GestaoData = {
    gestaoModo: 'full',
    operadorPessoal,
    operadorAtual: { id: operador.id, nome: String(operador.nome), perfil },
    gaep,
    operadores: opsData,
    categorias,
    atividades: atividades as AtividadeRow[],
    feriados: (ferRes.data ?? []) as FeriadoRow[],
    diasUteisMes: (diasUteisRes.data ?? []).map((d) => ({
      id: String(d.id),
      referenciaMes: String(d.referencia_mes),
      diasUteis: Number(d.dias_uteis),
    })) as DiasUteisMesRow[],
    configIA: iaRes.data
      ? {
          id: String(iaRes.data.id),
          modelo: String(iaRes.data.modelo),
          temperatura: Number(iaRes.data.temperatura),
          prompt: String(iaRes.data.prompt),
        }
      : {
          id: null,
          modelo: 'gpt-4o',
          temperatura: 0.3,
          prompt:
            'Você é um assistente oficial do GAEP. Redija descrições formais de atividades operacionais com base nos dados informados. Mantenha linguagem técnica e institucional.',
        },
    configRelatorio: relatorioCfgRes.data
      ? {
          id: String(relatorioCfgRes.data.id),
          tituloTexto: resolveTituloRelatorioFromDb(relatorioCfgRes.data.titulo_texto),
          subtituloTexto: String(relatorioCfgRes.data.subtitulo_texto ?? ''),
          descricaoTexto: String(relatorioCfgRes.data.descricao_texto ?? ''),
          rodapeTexto: String(relatorioCfgRes.data.rodape_texto ?? '{{GAEP}}'),
          timbradoUrl: relatorioCfgRes.data.timbrado_url ? String(relatorioCfgRes.data.timbrado_url) : null,
          tituloEstilo: {
            fontFamily: 'Times New Roman',
            fontColor: '#000000',
            align: 'center',
            indent: 0,
            lineHeight: 1.4,
            fontSize: 12,
            ...(relatorioCfgRes.data.titulo_estilo as Record<string, unknown>),
          } as ConfigRelatorioUIData['tituloEstilo'],
          subtituloEstilo: {
            fontFamily: 'Times New Roman',
            fontColor: '#000000',
            align: 'center',
            indent: 0,
            lineHeight: 1.3,
            fontSize: 11,
            ...(relatorioCfgRes.data.subtitulo_estilo as Record<string, unknown>),
          } as ConfigRelatorioUIData['subtituloEstilo'],
          descricaoEstilo: {
            fontFamily: 'Times New Roman',
            fontColor: '#111827',
            align: 'justify',
            indent: 12,
            lineHeight: 1.8,
            fontSize: 11,
            ...(relatorioCfgRes.data.descricao_estilo as Record<string, unknown>),
          } as ConfigRelatorioUIData['descricaoEstilo'],
          rodapeEstilo: {
            fontFamily: 'Times New Roman',
            fontColor: '#6b7280',
            align: 'right',
            indent: 0,
            lineHeight: 1.3,
            fontSize: 8,
            ...(relatorioCfgRes.data.rodape_estilo as Record<string, unknown>),
          } as ConfigRelatorioUIData['rodapeEstilo'],
          printMargins: (() => {
            const layout = (relatorioCfgRes.data as Record<string, unknown>)?.layout_pdf as
              | { margins?: { top?: number; right?: number; bottom?: number; left?: number } }
              | undefined
            const m = layout?.margins
            return {
              top: Number(m?.top ?? DEFAULT_PRINT_MARGINS_MM.top),
              right: Number(m?.right ?? DEFAULT_PRINT_MARGINS_MM.right),
              bottom: Number(m?.bottom ?? DEFAULT_PRINT_MARGINS_MM.bottom),
              left: Number(m?.left ?? DEFAULT_PRINT_MARGINS_MM.left),
            }
          })(),
        }
      : {
          id: null,
          tituloTexto: DEFAULT_TITULO_RELATORIO_INSTITUCIONAL,
          subtituloTexto: '',
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
          printMargins: { ...DEFAULT_PRINT_MARGINS_MM },
        },
    diarias: (diarRes.data ?? []).map((d) => ({
      id: String(d.id),
      tipo: String(d.tipo),
      locais: String(d.locais),
      valor: Number(d.valor),
      vigencia: String(d.vigencia),
    })) as DiariaRow[],
    gaeps: (gaepsRes.data ?? []) as GaepRow[],
  }

  // ── 5. Log de acesso (fire-and-forget) ───────────────────────
  logAudit({
    gaepId: gaep.id,
    operadorId: operador.id,
    acao: 'ACESSO',
    tabela: 'gestao',
    dadosDepois: { tab: tabParam ?? 'efetivo', perfil },
  }).catch(() => {})

  // ── 6. Render ─────────────────────────────────────────────────
  return (
    <>
      <SidebarNav nome={operador.nome} gaepCodigo={gaep.codigo} perfil={perfil} />
      <main
        style={{
          minHeight: '100vh',
          background: '#f3f4f6',
          padding: '74px 16px 20px',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div
            style={{
              textAlign: 'center',
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#1a237e',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: 14,
              marginBottom: 22,
              letterSpacing: 0.3,
            }}
          >
            GESTÃO
          </div>
          <GestaoClient data={data} />
        </div>
      </main>
    </>
  )
}
