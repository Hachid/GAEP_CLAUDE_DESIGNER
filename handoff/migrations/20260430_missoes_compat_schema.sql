-- Compatibiliza a tabela missoes com o schema esperado pelo app atual.
-- Execute no Supabase SQL Editor.

BEGIN;

ALTER TABLE public.missoes
  ADD COLUMN IF NOT EXISTS tipo_snapshot text,
  ADD COLUMN IF NOT EXISTS qtd integer,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.operadores(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.missoes
SET qtd = GREATEST(1, COALESCE(qtd_diarias, 1)::int)
WHERE qtd IS NULL;

UPDATE public.missoes
SET tipo_snapshot = COALESCE(tm.tipo, 'Tipo não informado')
FROM public.tipos_missao tm
WHERE public.missoes.tipo_snapshot IS NULL
  AND public.missoes.tipo_missao_id = tm.id;

UPDATE public.missoes
SET created_by = registrado_por_id
WHERE created_by IS NULL;

ALTER TABLE public.missoes
  ALTER COLUMN qtd SET NOT NULL,
  ALTER COLUMN qtd SET DEFAULT 1,
  ALTER COLUMN tipo_snapshot SET NOT NULL;

ALTER TABLE public.missoes
  ALTER COLUMN qtd_diarias SET DEFAULT 1;

UPDATE public.missoes
SET qtd_diarias = COALESCE(qtd_diarias, qtd::numeric, 1)
WHERE qtd_diarias IS NULL;

ALTER TABLE public.missoes
  ALTER COLUMN qtd_diarias SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_missoes_legacy_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.qtd := COALESCE(NEW.qtd, NEW.qtd_diarias::int, 1);
  NEW.qtd_diarias := COALESCE(NEW.qtd_diarias, NEW.qtd::numeric, 1);
  NEW.created_by := COALESCE(NEW.created_by, NEW.registrado_por_id);
  NEW.registrado_por_id := COALESCE(NEW.registrado_por_id, NEW.created_by);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_missoes_legacy_columns ON public.missoes;

CREATE TRIGGER trg_sync_missoes_legacy_columns
BEFORE INSERT OR UPDATE ON public.missoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_missoes_legacy_columns();

COMMIT;
