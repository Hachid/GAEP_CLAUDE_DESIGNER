-- Migração: catálogo fixo de atividades (17 nomes oficiais)
-- Executar no SQL Editor do Supabase (ordem idempotente).
--
-- Efeito:
-- 1) Garante que todas as atividades da lista existam (insert se faltar).
-- 2) Reativa linhas soft-deleted cujo nome está na lista.
-- 3) Reaponta relatórios que usam atividade fora da lista para "Outros".
-- 4) Remove do catálogo as atividades cujo nome não está na lista (DELETE).
--
-- Pré-requisito: coluna deleted_at em public.atividades (schema GAEP v1).

BEGIN;

-- Lista canônica (grafias exatas)
CREATE TEMP TABLE tmp_atividades_permitidas (nome text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO tmp_atividades_permitidas (nome) VALUES
  ('Abordagem'),
  ('Administrativo'),
  ('Algemamento'),
  ('Apoio a Unidade'),
  ('Armamento e Tiro'),
  ('Atividade Física'),
  ('CQB'),
  ('Drone'),
  ('Escolta'),
  ('Intervenção'),
  ('Luta Policial'),
  ('Outros'),
  ('Patrulhamento'),
  ('PDU'),
  ('Rádio Comunicação'),
  ('Segurança de Autoridades'),
  ('TTML');

-- 1) Inserir nomes que ainda não existem (nenhuma linha com esse nome)
INSERT INTO public.atividades (nome, ativo)
SELECT p.nome, true
FROM tmp_atividades_permitidas p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.atividades a
  WHERE lower(btrim(a.nome)) = lower(btrim(p.nome))
);

-- 2) Reativar permitidas que estavam soft-deleted
UPDATE public.atividades a
SET deleted_at = NULL, ativo = true
FROM tmp_atividades_permitidas p
WHERE lower(btrim(a.nome)) = lower(btrim(p.nome))
  AND a.deleted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.atividades a2
    WHERE a2.deleted_at IS NULL
      AND a2.id <> a.id
      AND lower(btrim(a2.nome)) = lower(btrim(a.nome))
  );

-- 3) ID canônico de "Outros" (para realocar relatórios órfãos)
WITH outros AS (
  SELECT id
  FROM public.atividades
  WHERE lower(btrim(nome)) = lower(btrim('Outros'))
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.relatorios r
SET atividade_id = (SELECT id FROM outros)
FROM public.atividades a
WHERE r.atividade_id = a.id
  AND NOT EXISTS (
    SELECT 1
    FROM tmp_atividades_permitidas p
    WHERE lower(btrim(p.nome)) = lower(btrim(a.nome))
  );

-- 4) Remover do catálogo tudo que não está na lista (após realocar FKs)
DELETE FROM public.atividades a
WHERE NOT EXISTS (
  SELECT 1
  FROM tmp_atividades_permitidas p
  WHERE lower(btrim(p.nome)) = lower(btrim(a.nome))
);

COMMIT;

-- Verificação: deve retornar 17 linhas, nomes iguais à lista
SELECT nome, deleted_at, ativo
FROM public.atividades
ORDER BY nome;
