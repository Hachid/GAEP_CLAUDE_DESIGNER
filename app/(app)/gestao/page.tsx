import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GestaoClient } from './GestaoClient'
import { SidebarNav } from '@/components/layout/SidebarNav'
import type {
  GestaoData,
  OperadorRow,
  AtividadeRow,
  FeriadoRow,
  DiariaRow,
  GaepRow,
} from './GestaoClient'

export default async function GestaoPage() {
  // ── 1. Auth ───────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const admin = createAdminClient()

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
    .eq('auth_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<OperadorComGaep>()

  if (!operador) redirect('/relatorio')

  const perfil = String(operador.perfil)
  if (!['ADMIN', 'SUPER_ADMIN'].includes(perfil)) redirect('/relatorio')

  const gaep = operador.gaeps
  if (!gaep) redirect('/relatorio')

  // ── 3. Busca de dados em paralelo ─────────────────────────────
  const [opRes, catRes, atRes, ferRes, iaRes, diarRes, gaepsRes] = await Promise.all([
    admin
      .from('operadores')
      .select('id, nome, matricula, perfil, equipe, ativo, email_funcional')
      .eq('gaep_id', gaep.id)
      .is('deleted_at', null)
      .order('nome'),

    admin.from('categorias_atividade').select('id, nome').order('nome'),

    admin
      .from('atividades')
      .select('id, nome, categoria_id')
      .is('deleted_at', null)
      .order('nome'),

    admin
      .from('feriados')
      .select('id, data, descricao')
      .eq('gaep_id', gaep.id)
      .order('data'),

    admin
      .from('config_ia')
      .select('id, modelo, temperatura, prompt')
      .eq('gaep_id', gaep.id)
      .maybeSingle(),

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
    operadorAtual: { id: operador.id, nome: String(operador.nome), perfil },
    gaep,
    operadores: (opRes.data ?? []) as OperadorRow[],
    categorias: (catRes.data ?? []) as { id: string; nome: string }[],
    atividades: (atRes.data ?? []) as AtividadeRow[],
    feriados: (ferRes.data ?? []) as FeriadoRow[],
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
    diarias: (diarRes.data ?? []).map((d) => ({
      id: String(d.id),
      tipo: String(d.tipo),
      locais: String(d.locais),
      valor: Number(d.valor),
      vigencia: String(d.vigencia),
    })) as DiariaRow[],
    gaeps: (gaepsRes.data ?? []) as GaepRow[],
  }

  // ── 5. Render ─────────────────────────────────────────────────
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
