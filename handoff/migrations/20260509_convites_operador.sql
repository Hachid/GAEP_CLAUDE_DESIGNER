-- Convites públicos para cadastro de operador vinculado a um GAEP (Gestão → Efetivo).
CREATE TABLE IF NOT EXISTS public.convites_operador (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gaep_id     UUID NOT NULL REFERENCES public.gaeps(id),
  token       TEXT NOT NULL UNIQUE,
  created_by  UUID REFERENCES public.operadores(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_convites_operador_gaep_ativo
  ON public.convites_operador (gaep_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_convites_operador_token_ativo
  ON public.convites_operador (token)
  WHERE used_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.convites_operador ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.convites_operador IS
  'Link de convite para auto-cadastro de operador no GAEP; uso único após used_at.';
