-- Configuração visual do Relatório em PDF (por GAEP)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS config_relatorio (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gaep_id          uuid NOT NULL UNIQUE REFERENCES gaeps(id),
  titulo_texto     text NOT NULL DEFAULT 'RELATÓRIO OPERACIONAL',
  descricao_texto  text NOT NULL DEFAULT '',
  rodape_texto     text NOT NULL DEFAULT '{{GAEP}}',
  titulo_estilo    jsonb NOT NULL DEFAULT '{"fontFamily":"Times New Roman","fontColor":"#000000","align":"center","indent":0,"lineHeight":1.4}'::jsonb,
  descricao_estilo jsonb NOT NULL DEFAULT '{"fontFamily":"Times New Roman","fontColor":"#111827","align":"justify","indent":12,"lineHeight":1.8}'::jsonb,
  rodape_estilo    jsonb NOT NULL DEFAULT '{"fontFamily":"Times New Roman","fontColor":"#6b7280","align":"right","indent":0,"lineHeight":1.3}'::jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES operadores(id)
);

CREATE INDEX IF NOT EXISTS idx_config_relatorio_gaep_id ON config_relatorio (gaep_id);

ALTER TABLE config_relatorio ENABLE ROW LEVEL SECURITY;
