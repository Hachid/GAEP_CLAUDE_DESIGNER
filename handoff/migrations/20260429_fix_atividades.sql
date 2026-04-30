-- Migração: remove categoria_id da tabela atividades
-- Atividades são universais — qualquer categoria pode usar qualquer atividade.
-- Executar no Supabase SQL Editor

-- ── PASSO 1 — Verificar duplicatas de nome antes de criar UNIQUE(nome) ────────
-- Resultado esperado: zero linhas. Se houver linhas, resolver manualmente antes.
SELECT nome, count(*)
FROM public.atividades
WHERE deleted_at IS NULL
GROUP BY nome
HAVING count(*) > 1;

-- ── PASSO 2 — Remover constraint UNIQUE(categoria_id, nome) ──────────────────
ALTER TABLE public.atividades
  DROP CONSTRAINT IF EXISTS atividades_categoria_id_nome_key;

-- ── PASSO 3 — Remover FK de categoria_id ─────────────────────────────────────
ALTER TABLE public.atividades
  DROP CONSTRAINT IF EXISTS atividades_categoria_id_fkey;

-- ── PASSO 4 — Remover coluna categoria_id ────────────────────────────────────
ALTER TABLE public.atividades
  DROP COLUMN IF EXISTS categoria_id;

-- ── PASSO 5 — Criar UNIQUE(nome) para atividades ativas ──────────────────────
ALTER TABLE public.atividades
  ADD CONSTRAINT atividades_nome_key UNIQUE (nome);

-- ── PASSO 6 — Confirmar estrutura ────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'atividades'
ORDER BY ordinal_position;
