-- Armazena ajustes de layout de impressão (margens) no config_relatorio.
-- Execute no Supabase SQL Editor.

BEGIN;

ALTER TABLE public.config_relatorio
  ADD COLUMN IF NOT EXISTS layout_pdf jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
