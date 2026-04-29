-- Módulo Missões / Diárias (Etapa 5)
-- Executa no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS missoes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gaep_id                 uuid NOT NULL REFERENCES gaeps(id),
  operador_id             uuid NOT NULL REFERENCES operadores(id),
  tipo_missao_id          uuid REFERENCES tipos_missao(id),
  tipo_snapshot           text NOT NULL,
  qtd                     integer NOT NULL DEFAULT 1 CHECK (qtd > 0),
  valor_unitario_snapshot numeric(10, 2) NOT NULL,
  valor_total             numeric(10, 2) NOT NULL,
  observacao              text,
  created_by              uuid REFERENCES operadores(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS missoes_gaep_id_idx        ON missoes (gaep_id);
CREATE INDEX IF NOT EXISTS missoes_operador_id_idx    ON missoes (operador_id);
CREATE INDEX IF NOT EXISTS missoes_deleted_at_idx     ON missoes (deleted_at);

-- RLS (service_role já tem bypass, apenas garantir que anon/auth não acessa direto)
ALTER TABLE missoes ENABLE ROW LEVEL SECURITY;

-- Política: somente via service_role (server actions usam createAdminClient)
-- Se precisar de acesso via client supabase (não recomendado), adicionar policy aqui.
