-- Dias uteis por GAEP/mes para calculo de carga horaria prevista e saldo
CREATE TABLE IF NOT EXISTS public.gaep_dias_uteis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gaep_id uuid NOT NULL REFERENCES public.gaeps(id) ON DELETE CASCADE,
  referencia_mes char(7) NOT NULL,
  dias_uteis integer NOT NULL CHECK (dias_uteis BETWEEN 0 AND 31),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gaep_id, referencia_mes)
);

CREATE INDEX IF NOT EXISTS idx_gaep_dias_uteis_gaep_mes
  ON public.gaep_dias_uteis (gaep_id, referencia_mes);

ALTER TABLE public.gaep_dias_uteis ENABLE ROW LEVEL SECURITY;
