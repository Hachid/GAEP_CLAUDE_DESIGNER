-- Garante coluna `email_funcional` (cadastro gestão + convite). Idempotente.
-- Execute no SQL Editor se o projeto não usar `npm run db:sync`.

ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS email_funcional text;
