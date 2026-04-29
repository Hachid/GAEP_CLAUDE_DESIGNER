-- Índices de performance (Etapa 5 — otimização)
-- Todos são CREATE INDEX IF NOT EXISTS — seguros para reexecutar

-- relatorios: query principal do Dashboard e Desempenho
-- WHERE gaep_id = ? AND deleted_at IS NULL AND data BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_relatorios_gaep_data
  ON relatorios (gaep_id, data)
  WHERE deleted_at IS NULL;

-- relatorios: evoluçao mensal (ORDER BY data)
CREATE INDEX IF NOT EXISTS idx_relatorios_gaep_data_evo
  ON relatorios (gaep_id, data DESC)
  WHERE deleted_at IS NULL;

-- relatorio_participantes: lookup por operador (Desempenho)
-- WHERE operador_id = ?
CREATE INDEX IF NOT EXISTS idx_relpart_operador_id
  ON relatorio_participantes (operador_id);

-- operadores: lookup por auth_id (todas as páginas)
-- WHERE auth_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_operadores_auth_id
  ON operadores (auth_id)
  WHERE deleted_at IS NULL;

-- operadores: lookup por gaep_id (listagem de efetivo)
CREATE INDEX IF NOT EXISTS idx_operadores_gaep_id
  ON operadores (gaep_id)
  WHERE deleted_at IS NULL;

-- missoes: query da página Missões
-- WHERE gaep_id = ? AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_missoes_gaep_id
  ON missoes (gaep_id)
  WHERE deleted_at IS NULL;
