-- Migration 003: suporte a Plantão (turno multi-dia)
-- Executar no Supabase SQL Editor antes de fazer deploy da feature.

ALTER TABLE relatorios
  ADD COLUMN IF NOT EXISTS plantao  BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_fim DATE;

COMMENT ON COLUMN relatorios.plantao  IS 'true quando o turno cruza a meia-noite e termina em outro dia';
COMMENT ON COLUMN relatorios.data_fim IS 'Data de término do plantão (NULL = mesmo dia que data)';
