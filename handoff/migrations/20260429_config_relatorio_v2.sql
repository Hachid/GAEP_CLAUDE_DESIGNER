-- Migração v2: subtítulo e papel timbrado customizável
-- Executar no Supabase SQL Editor após 20260429_config_relatorio.sql

ALTER TABLE config_relatorio
  ADD COLUMN IF NOT EXISTS subtitulo_texto text NOT NULL DEFAULT 'RELATÓRIO DE ATIVIDADE(S)',
  ADD COLUMN IF NOT EXISTS subtitulo_estilo jsonb NOT NULL DEFAULT '{"fontFamily":"Times New Roman","fontColor":"#000000","align":"center","indent":0,"lineHeight":1.3,"fontSize":11}'::jsonb,
  ADD COLUMN IF NOT EXISTS timbrado_url text;
