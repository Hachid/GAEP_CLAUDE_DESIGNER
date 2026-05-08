-- Migration 004: Índices de performance para audit_log
-- A tabela audit_log já existe em 001_schema.sql.
-- Este arquivo adiciona índices para as consultas da aba de Logs.

-- Índice principal para listagem cronológica reversa
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log (created_at DESC);

-- Filtro por GAEP
CREATE INDEX IF NOT EXISTS idx_audit_log_gaep_id
  ON audit_log (gaep_id, created_at DESC);

-- Filtro por tipo de ação
CREATE INDEX IF NOT EXISTS idx_audit_log_acao
  ON audit_log (acao, created_at DESC);

-- Filtro por operador
CREATE INDEX IF NOT EXISTS idx_audit_log_operador_id
  ON audit_log (operador_id, created_at DESC);

-- Filtro por tabela/recurso
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela
  ON audit_log (tabela, created_at DESC);
