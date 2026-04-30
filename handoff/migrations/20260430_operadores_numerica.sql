-- Adiciona a coluna "numerica" para exibir identificador no avatar do operador.
-- Execute no Supabase SQL Editor.

BEGIN;

ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS numerica text;

-- Backfill inicial usando a matricula atual para não deixar operadores sem valor.
UPDATE public.operadores
SET numerica = matricula
WHERE (numerica IS NULL OR btrim(numerica) = '')
  AND matricula IS NOT NULL
  AND btrim(matricula) <> '';

CREATE INDEX IF NOT EXISTS operadores_numerica_idx
  ON public.operadores (numerica);

COMMIT;
