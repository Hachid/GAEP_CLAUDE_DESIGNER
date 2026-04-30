-- ============================================================
-- GAEP — Seed (dados iniciais)
-- Execute APÓS o 001_schema.sql
-- ============================================================

-- GAEP-CAT (unidade piloto)
INSERT INTO gaeps (id, codigo, cidade, estado) VALUES
  ('00000000-0000-0000-0000-000000000001', 'GAEP-CAT', 'Catanduvas', 'PR'),
  ('00000000-0000-0000-0000-000000000002', 'GAEP-CG',  'Campo Grande', 'MS'),
  ('00000000-0000-0000-0000-000000000003', 'GAEP-PV',  'Ponta Porã', 'MS');

-- Categorias
INSERT INTO categorias_atividade (id, nome) VALUES
  ('10000000-0000-0000-0000-000000000001', 'OPERAR'),
  ('10000000-0000-0000-0000-000000000002', 'TREINAR'),
  ('10000000-0000-0000-0000-000000000003', 'INSTRUIR');

-- Atividades (universais — catálogo oficial GAEP)
INSERT INTO atividades (nome) VALUES
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

-- Tipos de Missão
INSERT INTO tipos_missao (tipo, locais, valor, vigencia) VALUES
  ('Tipo 1', 'Brasília, São Paulo, Rio de Janeiro e Manaus', 425.00, '2025-01-01'),
  ('Tipo 2', 'Demais Capitais Estaduais', 380.00, '2025-01-01'),
  ('Tipo 3', 'Outras Localidades', 335.00, '2025-01-01');

-- Feriados 2026
INSERT INTO feriados (gaep_id, data, descricao) VALUES
  ('00000000-0000-0000-0000-000000000001', '2026-01-01', 'Confraternização Universal'),
  ('00000000-0000-0000-0000-000000000001', '2026-04-07', 'Paixão de Cristo'),
  ('00000000-0000-0000-0000-000000000001', '2026-04-21', 'Tiradentes'),
  ('00000000-0000-0000-0000-000000000001', '2026-05-01', 'Dia do Trabalho'),
  ('00000000-0000-0000-0000-000000000001', '2026-09-07', 'Independência do Brasil'),
  ('00000000-0000-0000-0000-000000000001', '2026-10-12', 'Nossa Sra. Aparecida'),
  ('00000000-0000-0000-0000-000000000001', '2026-11-02', 'Finados'),
  ('00000000-0000-0000-0000-000000000001', '2026-11-15', 'Proclamação da República'),
  ('00000000-0000-0000-0000-000000000001', '2026-12-25', 'Natal');

-- Config IA padrão
INSERT INTO config_ia (gaep_id, modelo, temperatura, prompt) VALUES
  ('00000000-0000-0000-0000-000000000001', 'gpt-4o', 0.3,
   'Você é um assistente oficial do GAEP. Redija descrições formais de atividades operacionais com base nos dados informados. Mantenha linguagem técnica e institucional. Não invente fatos — apenas corrija gramática e organize o texto. Padrão: "No dia {DATA} no período {HORA_INICIO} às {HORA_FIM} os operadores {LISTA} realizaram a {CATEGORIA} de {ATIVIDADE}. {DESCRICAO_CORRIGIDA}"'
  );
