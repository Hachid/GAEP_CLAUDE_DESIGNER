-- Garante coluna usada pelo cadastro (gestão + convite). Já existe no 001_schema.sql em instalações novas.
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS email_funcional text;

COMMENT ON COLUMN public.operadores.email_funcional IS 'E-mail institucional / funcional (PM), distinto do e-mail pessoal em "email").';
