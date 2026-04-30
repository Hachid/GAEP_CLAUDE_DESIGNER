-- Campos complementares de cadastro do operador.
-- Migração segura: apenas adiciona colunas (sem remover/renomear), evitando quebra de compatibilidade.
-- Execute no Supabase SQL Editor.

BEGIN;

ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS numerica text,
  ADD COLUMN IF NOT EXISTS tipo_sanguineo text,
  ADD COLUMN IF NOT EXISTS alergia text,
  ADD COLUMN IF NOT EXISTS contato_emergencia text,
  ADD COLUMN IF NOT EXISTS nome_contato_emergencia text,
  ADD COLUMN IF NOT EXISTS plano_saude text,
  ADD COLUMN IF NOT EXISTS numero_carteirinha text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS email text;

-- Sem backfill automático:
-- "numerica" e os demais campos são opcionais e independentes de "matricula".

CREATE INDEX IF NOT EXISTS operadores_numerica_idx
  ON public.operadores (numerica);

CREATE INDEX IF NOT EXISTS operadores_cpf_idx
  ON public.operadores (cpf);

COMMIT;
