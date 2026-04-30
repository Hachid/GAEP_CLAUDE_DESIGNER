-- Permite frações de diária em missões (ex.: 0.5, 4.5).
-- Execute no Supabase SQL Editor.

BEGIN;

ALTER TABLE public.missoes
  ALTER COLUMN qtd TYPE numeric(10,2) USING qtd::numeric,
  ALTER COLUMN qtd SET DEFAULT 1.00;

ALTER TABLE public.missoes
  DROP CONSTRAINT IF EXISTS missoes_qtd_check;

ALTER TABLE public.missoes
  ADD CONSTRAINT missoes_qtd_check CHECK (qtd > 0);

CREATE OR REPLACE FUNCTION public.sync_missoes_legacy_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.qtd := COALESCE(NEW.qtd, NEW.qtd_diarias::numeric, 1.00);
  NEW.qtd_diarias := COALESCE(NEW.qtd_diarias, NEW.qtd::numeric, 1.00);
  NEW.created_by := COALESCE(NEW.created_by, NEW.registrado_por_id);
  NEW.registrado_por_id := COALESCE(NEW.registrado_por_id, NEW.created_by);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMIT;
