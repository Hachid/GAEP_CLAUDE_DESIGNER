# 🛡️ PROMPT — ETAPAS 3 a 6 (resumido)
## Use um de cada vez no Claude Code

---

## ETAPA 3 — Painel BI (`app/(app)/dashboard/page.tsx`)

Implemente o Painel BI do GAEP seguindo o protótipo em `handoff/design/GAEP Prototype.html` (menu "Painel BI").

**Componentes:**
- `FiltrosDash` — colapsível, datas + categoria + atividade
- `KPIGrid` — 2 cards grandes (total registros + carga horária) + 3 cards categorias
- `DonutCategoria` — Recharts PieChart, legenda com horas: "Treinar  22:30h"
- `RankingBars` — Recharts BarChart horizontal, label de horas no final de cada barra
- `EvolucaoLinhas` — Recharts LineChart, filtros Trimestral/Semestral/Anual/Todo Período

**Queries Supabase:** agregar por gaep_id + período filtrado.
**Commit:** `feat(dashboard): implementar painel BI com gráficos Recharts`

---

## ETAPA 4 — Desempenho Individual (`app/(app)/operadores/page.tsx`)

Implemente o Desempenho Individual seguindo o protótipo (menu "Desempenho").

**Componentes:**
- `SeletorOperador` — select com todos operadores do GAEP
- `TabsMesPeriodo` — tabs "Mês Referência" | "Período Exato"
- `GraficosOperador` — Donut + Barras (mesmo padrão do BI)
- `FolhaPonto` — tabela com múltiplas atividades por dia:
  - Colunas: Data (DD/MM/AAAA) | Atividade | Início | Fim | Total
  - Linha "TOTAL DO DIA" laranja após cada grupo do dia
  - Rodapé "TOTAL GERAL" azul escuro

**Commit:** `feat(operadores): implementar desempenho individual e folha ponto`

---

## ETAPA 5 — Missões (`app/(app)/missoes/page.tsx`)

Implemente o módulo de Missões/Diárias seguindo o protótipo (menu "Missões").

**Formulário:** Select operador + Qtd diárias + Tipo + Textarea observação
**Ranking accordion:**
- Linha clicável por operador → expande missões individuais
- Cada missão: tipo + valor + observação + botões Editar/Excluir
- Editar: textarea inline para observação
- Excluir: soft delete (deleted_at = now())
- Valor = qtd × valor_unitario_snapshot (nunca retroage)

**Commit:** `feat(missoes): implementar controle de diárias com ranking expansível`

---

## ETAPA 6 — Gestão Admin (`app/(app)/gestao/page.tsx`)

Implemente o módulo de Gestão seguindo o protótipo (menu "Gestão").

**Verificar perfil antes de renderizar:**
```typescript
// ADMIN → 5 abas: Efetivo, Atividades, Feriados, Config IA, Diárias
// SUPER_ADMIN → + aba GAEPs
// Outros perfis → redirect para /relatorio
```

**6 abas:**
1. **Efetivo** — CRUD operadores, busca, modal edição, soft delete
2. **Atividades** — CRUD por categoria (OPERAR/TREINAR/INSTRUIR)
3. **Feriados** — calendário do ano, add/remove, afeta carga horária
4. **Config IA** — modelo, temperatura (slider), prompt (monospace textarea), testar
5. **Diárias** — editar valores Tipo 1/2/3 com registro de vigência
6. **GAEPs** (SUPER_ADMIN) — gerenciar unidades nacionais

**Badge de nível:**
- SUPER_ADMIN: borda + texto #7c3aed, ícone 🔑
- ADMIN: borda + texto #1a237e, ícone ⚙️

**Commit:** `feat(gestao): implementar módulo admin completo com 6 abas`
