// ============================================================
// GAEP — Tipos TypeScript baseados no schema real do banco
// ============================================================

// ── Enums (CHECK constraints reais) ──────────────────────────

export type Perfil = 'super_admin' | 'admin' | 'supervisor' | 'operador' | 'auditor'

export type Regime = 'expediente' | 'plantao'

export type TipoAfastamento =
  | 'ferias'
  | 'licenca_medica'
  | 'atestado'
  | 'missao_externa'
  | 'folga'
  | 'outro'

// ── Tabelas ───────────────────────────────────────────────────

export interface Gaep {
  id: string
  nome: string
  cidade: string
  estado: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** id = auth.users.id (FK direto) */
export interface Operador {
  id: string
  gaep_id: string
  auth_id: string | null
  matricula: string
  nome_completo: string
  nome_guerra: string
  cargo: string
  regime: Regime
  email_funcional: string | null
  telefone: string | null
  perfil: Perfil
  tipo_sanguineo: string | null
  alergias: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Equipe {
  id: string
  gaep_id: string
  nome: string
  descricao: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface OperadorEquipe {
  id: string
  operador_id: string
  equipe_id: string
  data_entrada: string
  data_saida: string | null
  motivo_saida: string | null
  created_at: string
}

export interface CategoriaAtividade {
  id: string
  nome: string
  descricao: string | null
}

export interface Atividade {
  id: string
  categoria_id: string
  nome: string
  descricao: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Relatorio {
  id: string
  gaep_id: string
  atividade_id: string
  relator_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  descricao_bruta: string | null
  descricao_ia: string | null
  descricao_final: string
  outros_integrantes: string | null
  versao_atual: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface RelatorioParticipante {
  id: string
  relatorio_id: string
  operador_id: string
  hora_inicio: string
  hora_fim: string
  created_at: string
}

export interface RelatorioFoto {
  id: string
  relatorio_id: string
  storage_path: string
  nome_arquivo: string
  ordem: number
  legenda: string | null
  created_at: string
  deleted_at: string | null
}

export interface RelatorioVersao {
  id: string
  relatorio_id: string
  versao: number
  descricao_final: string
  editado_por: string
  created_at: string
}

export interface TipoMissao {
  id: string
  gaep_id: string
  nome: string
  valor_diaria: number
  vigencia_inicio: string
  vigencia_fim: string | null
  created_at: string
}

export interface Missao {
  id: string
  gaep_id: string
  tipo_missao_id: string
  operador_id: string
  data_inicio: string
  data_fim: string
  qtd_diarias: number
  valor_unitario_snapshot: number
  valor_total: number | null
  descricao: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Feriado {
  id: string
  gaep_id: string | null
  data: string
  descricao: string
  tipo: string
  created_at: string
  deleted_at: string | null
}

export interface AgendaAfastamento {
  id: string
  gaep_id: string
  operador_id: string
  tipo: TipoAfastamento
  data_inicio: string
  data_fim: string
  descricao: string | null
  aprovado_por: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AuditLog {
  id: string
  gaep_id: string | null
  operador_id: string | null
  acao: string
  tabela: string | null
  registro_id: string | null
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
