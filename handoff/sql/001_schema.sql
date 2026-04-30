-- ============================================================
-- GAEP — Schema Supabase v1
-- Execute no SQL Editor do Supabase
-- Ordem: rodar tudo de uma vez
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. GAEPs (unidades) ──────────────────────────────────────
CREATE TABLE gaeps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo      TEXT NOT NULL UNIQUE,  -- 'GAEP-CAT'
  cidade      TEXT NOT NULL,
  estado      CHAR(2) NOT NULL,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ── 2. Operadores ────────────────────────────────────────────
CREATE TABLE operadores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id     UUID REFERENCES gaeps(id),
  auth_id     UUID REFERENCES auth.users(id),  -- Supabase Auth
  nome        TEXT NOT NULL,
  matricula   TEXT NOT NULL UNIQUE,
  perfil      TEXT NOT NULL CHECK (perfil IN (
                'OPERADOR','SUPERVISOR','ADMIN','SUPER_ADMIN','AUDITOR'
              )),
  equipe      TEXT,
  email_funcional TEXT,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ── 3. Categorias de Atividade ───────────────────────────────
CREATE TABLE categorias_atividade (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome  TEXT NOT NULL UNIQUE  -- 'OPERAR', 'TREINAR', 'INSTRUIR'
);

-- ── 4. Atividades ────────────────────────────────────────────
CREATE TABLE atividades (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL UNIQUE,
  ativo      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ── 5. Relatórios ────────────────────────────────────────────
CREATE TABLE relatorios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id             UUID REFERENCES gaeps(id),
  relatorista_id      UUID REFERENCES operadores(id),
  data                DATE NOT NULL,
  hora_inicio         TIME NOT NULL,
  hora_fim            TIME NOT NULL,
  horas_totais        NUMERIC(5,2),  -- em horas decimais
  categoria_id        UUID REFERENCES categorias_atividade(id),
  atividade_id        UUID REFERENCES atividades(id),
  outros_integrantes  TEXT,
  descricao_bruta     TEXT,
  descricao_revisada  TEXT NOT NULL,
  ocorrencias         TEXT,
  fotos_urls          TEXT[],        -- array de URLs do Storage
  versao              INT DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- ── 6. Participantes do Relatório ────────────────────────────
CREATE TABLE relatorio_participantes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id UUID REFERENCES relatorios(id) ON DELETE CASCADE,
  operador_id  UUID REFERENCES operadores(id),
  hora_inicio  TIME,
  hora_fim     TIME,
  horas_totais NUMERIC(5,2),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 7. Versões de Relatórios (audit trail) ───────────────────
CREATE TABLE relatorio_versoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relatorio_id      UUID REFERENCES relatorios(id),
  editado_por_id    UUID REFERENCES operadores(id),
  versao            INT NOT NULL,
  descricao_anterior TEXT,
  descricao_nova    TEXT,
  motivo            TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── 8. Missões (Diárias) ─────────────────────────────────────
CREATE TABLE tipos_missao (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL,  -- 'Tipo 1', 'Tipo 2', 'Tipo 3'
  locais      TEXT NOT NULL,
  valor       NUMERIC(10,2) NOT NULL,
  vigencia    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE missoes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id               UUID REFERENCES gaeps(id),
  operador_id           UUID REFERENCES operadores(id),
  tipo_missao_id        UUID REFERENCES tipos_missao(id),
  qtd_diarias           NUMERIC(5,1) NOT NULL,
  valor_unitario_snapshot NUMERIC(10,2) NOT NULL,  -- snapshot do momento
  valor_total           NUMERIC(10,2) NOT NULL,
  observacao            TEXT,
  data_missao           DATE DEFAULT CURRENT_DATE,
  registrado_por_id     UUID REFERENCES operadores(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ── 9. Feriados ──────────────────────────────────────────────
CREATE TABLE feriados (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id    UUID REFERENCES gaeps(id),
  data       DATE NOT NULL,
  descricao  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gaep_id, data)
);

-- ── 10. Config IA ────────────────────────────────────────────
CREATE TABLE config_ia (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id     UUID REFERENCES gaeps(id) UNIQUE,
  modelo      TEXT DEFAULT 'gpt-4o',
  temperatura NUMERIC(3,2) DEFAULT 0.3,
  prompt      TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES operadores(id)
);

-- ── 11. Agenda / Afastamentos ────────────────────────────────
CREATE TABLE agenda_afastamentos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id       UUID REFERENCES gaeps(id),
  operador_id   UUID REFERENCES operadores(id),
  tipo          TEXT CHECK (tipo IN (
                  'FERIAS','LICENCA_MEDICA','ATESTADO',
                  'MISSAO_EXTERNA','FOLGA','OUTRO'
                )),
  data_inicio   DATE NOT NULL,
  data_fim      DATE NOT NULL,
  descricao     TEXT,
  aprovado_por  UUID REFERENCES operadores(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- ── 12. Audit Log (IMUTÁVEL) ─────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaep_id     UUID,
  operador_id UUID,
  acao        TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN'
  tabela      TEXT,
  registro_id UUID,
  dados_antes JSONB,
  dados_depois JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
  -- NUNCA adicionar UPDATE ou DELETE nesta tabela
);

-- ── RLS — Row Level Security ──────────────────────────────────
ALTER TABLE gaeps                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE missoes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados               ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_ia              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_afastamentos    ENABLE ROW LEVEL SECURITY;

-- Política base: operador vê apenas o seu GAEP
CREATE POLICY "operador_ve_seu_gaep" ON relatorios
  FOR SELECT USING (
    gaep_id = (
      SELECT gaep_id FROM operadores
      WHERE auth_id = auth.uid()
    )
  );

-- Super Admin vê tudo
CREATE POLICY "super_admin_ve_tudo" ON relatorios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM operadores
      WHERE auth_id = auth.uid()
      AND perfil = 'SUPER_ADMIN'
    )
  );

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_relatorios_gaep_data    ON relatorios(gaep_id, data);
CREATE INDEX idx_relatorios_data         ON relatorios(data);
CREATE INDEX idx_participantes_operador  ON relatorio_participantes(operador_id);
CREATE INDEX idx_missoes_operador        ON missoes(operador_id);
CREATE INDEX idx_missoes_deleted         ON missoes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_relatorios_deleted      ON relatorios(deleted_at) WHERE deleted_at IS NULL;
