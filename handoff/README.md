# 🛡️ GAEP — Handoff de Design para Claude Code
**Sistema de Gestão de Atividades e Efetivo Policial**
**Unidade Piloto:** GAEP-CAT — Catanduvas/PR
**Data:** 28/04/2026
**Fidelidade:** HIGH-FIDELITY — pixel-perfect, replicar exatamente o protótipo

---

## ⚠️ LEIA ANTES DE COMEÇAR

Os arquivos HTML neste pacote são **protótipos de referência de design** — não são código de produção.
Sua tarefa é **recriar cada tela no Next.js/TypeScript existente**, usando:
- Tailwind CSS para estilos
- Supabase para dados
- Os tokens de design deste documento (cores, fontes, espaçamentos)

**Regra de ouro:** Não quebrar o que já existe. Implementar uma etapa por vez, testar, depois avançar.

---

## 🎨 Design Tokens

```css
/* Cores principais */
--primary:      #1a237e   /* Azul GAEP — botões principais, headers, links */
--primary-dark: #121858   /* Hover do primary */
--accent:       #2563eb   /* Botão IA, links secundários */
--orange:       #f97316   /* Carga horária, destaques, warnings */
--green:        #16a34a   /* Sucesso, salvar, ativo */
--danger:       #ef4444   /* Erro, excluir, desativar */
--purple:       #7c3aed   /* Super Admin */

/* Neutros */
--bg:       #f3f4f6   /* Fundo geral */
--surface:  #ffffff   /* Cards, modais */
--border:   #e2e8f0   /* Bordas */
--text:     #1e293b   /* Texto principal */
--muted:    #64748b   /* Labels, subtextos */

/* Tipografia */
font-family: 'Segoe UI', Roboto, Helvetica, sans-serif
font-size base: 16px (mobile)
```

```js
// tailwind.config.js — adicionar estes tokens
colors: {
  primary: { DEFAULT: '#1a237e', dark: '#121858' },
  accent:  '#2563eb',
  gaep: {
    orange: '#f97316',
    green:  '#16a34a',
    danger: '#ef4444',
    purple: '#7c3aed',
  }
}
```

---

## 📐 Layout Geral

```
┌─────────────────────────────────┐
│  HEADER (sticky, bg #1a237e)    │  h=54px, padding 15px
│  ☰  GAEP-CAT                   │
├─────────────────────────────────┤
│                                 │
│  SCREEN CONTENT                 │  flex:1, overflow-y:auto
│  padding: 20px 16px             │  padding-bottom: 80px
│  max-width: 430px               │
│                                 │
└─────────────────────────────────┘

SIDEBAR (drawer, z-index 210)
  width: 270px
  transform: translateX(-100%) → translateX(0)
  transition: 0.3s cubic-bezier(.4,0,.2,1)

BACKDROP (blur 4px, rgba(15,23,42,0.55))
```

---

## 🗂️ ETAPAS DE IMPLEMENTAÇÃO

---

### ETAPA 1 — Tela de Login

**Arquivo alvo:** `app/(auth)/login/page.tsx`

**Layout:**
```
Fundo: #f2f2f2 (cinza 5%)
Centro vertical: flex col, justify-center, align-center
Padding: 30px 20px

Logo GAEP:
  - Imagem: /public/gaep-logo.png
  - width: 120px, height: 120px
  - object-fit: contain
  - filter: drop-shadow(0 4px 16px rgba(0,0,0,0.18))
  - margin-bottom: 14px

Título: "GAEP-CAT"
  - font-size: 1.9rem, font-weight: 900
  - letter-spacing: 2px, color: #1a237e

Subtítulo: "Gestão de Atividades e Efetivo Policial"
  - font-size: 0.82rem, color: #64748b

Card branco:
  - background: #fff
  - border-radius: 20px
  - padding: 28px 24px
  - max-width: 360px, width: 100%
  - box-shadow: 0 20px 60px rgba(0,0,0,0.3)
```

**Campos:**
```
Select "Operador" → lista de operadores.nome do Supabase
Input "Matrícula / Senha" → type=password
Botão "Acessar Sistema" → bg #1a237e, full-width, padding 14px
```

**Lógica:**
```typescript
// Auth por matrícula
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${matricula}@gaep.internal`,
  password: senha
})
// Redirecionar para /relatorio após login
// Sessão sem expiração (configurar no Supabase)
```

**Estados:**
- Loading: botão desabilitado + texto "⏳ Verificando..."
- Erro: texto vermelho abaixo do botão
- Senha padrão = matrícula do operador

---

### ETAPA 2 — Registro de Operação (Relatório)

**Arquivo alvo:** `app/(app)/relatorio/page.tsx`

**Componentes necessários:**
```
<RelatoristaBadge />     → nome do usuário logado
<DateTimeBlock />        → data + início + término + duração
<CategoriaAtividade />   → 2 selects dependentes
<EquipeChips />          → chips toggler (TODOS + individuais)
<OutrosIntegrantes />    → input texto
<FotoUpload />           → até 3 fotos, Supabase Storage
<DescricaoMic />         → textarea + botão microfone (Web Speech API)
<BotoesAcao />           → Salvar Direto | Redigir com IA
<AreaRevisao />          → aparece após IA, textarea revisão + salvar
```

**DateTimeBlock — design:**
```
Card branco unificado (border-radius: 14px, border: 1px solid #e2e8f0)
┌─────────────────────────────────┐
│ 📅  DATA DO TURNO               │  border-bottom
│     [input type=date grande]    │
├──────────────────┬──────────────┤
│ ⏱ INÍCIO        │ 🏁 TÉRMINO   │  border-right no meio
│ [time input]     │ [time input] │
├─────────────────────────────────┤
│ ⏳ Duração: 06:00h  (laranja)   │  só aparece quando calculado
└─────────────────────────────────┘
```

**EquipeChips — lógica:**
```typescript
// Inicia com TODOS selecionados
const [equipe, setEquipe] = useState([...operadores])
const [todos, setTodos] = useState(true)

// Chip ativo = bg #1a237e, color #fff
// Chip inativo = bg #fff, color #64748b, border #e2e8f0
// Chip TODOS = border #1a237e sempre
```

**Integração IA:**
```typescript
// POST /api/ia com os dados do formulário
// Retorna texto formatado no padrão:
// "No dia {DATA} no período {INICIO} às {FIM} os operadores
//  {LISTA} realizaram a {CATEGORIA} de {ATIVIDADE}. {DESCRICAO}"
```

**Salvar no Supabase:**
```sql
INSERT INTO relatorios (
  gaep_id, data, hora_inicio, hora_fim, horas_totais,
  categoria_id, atividade_id, relatorista_id,
  outros_integrantes, descricao_bruta, descricao_revisada,
  ocorrencias, fotos_urls
)
-- Depois: INSERT INTO relatorio_participantes para cada operador
```

---

### ETAPA 3 — Painel BI

**Arquivo alvo:** `app/(app)/dashboard/page.tsx`

**Componentes:**
```
<FiltrosDash />       → datas + categoria + atividade (collapsible)
<KPIGrid />           → 2 cards grandes + 3 cards categorias
<DonutCategoria />    → Recharts PieChart com horas na legenda
<RankingBars />       → Recharts BarChart horizontal por categoria
<EvolucaoLinhas />    → Recharts LineChart mensal com filtro período
```

**KPI Cards — design:**
```
Card grande (1/2 grid):
  border-top: 4px solid #1a237e
  padding: 22px 10px, text-align: center
  valor: font-size 2.2rem, font-weight 800

Card categoria (1/3 grid):
  border-top: 3px solid {cor da categoria}
  OPERAR  → #1a237e
  TREINAR → #f97316
  INSTRUIR→ #16a34a
```

**Donut — legenda:**
```typescript
// Legenda mostra: "Treinar  22:30h" e "Operar  27:30h"
// Label gerado: `${categoria}  ${horasFormatadas}`
// Tooltip: "Treinar: 22.5h (45%)"
// cutout: '65%', borderWidth: 3, borderColor: '#fff'
```

**Gráfico de Linhas — EvolucaoMensal:**
```
Filtros: Trimestral (3m) | Semestral (6m) | Anual (12m) | Todo Período
Linha 1: Total Grupo — #1a237e, fill com gradiente, borderWidth 3
Linhas individuais: tracejadas, borderWidth 2
  Cores: #f97316, #2563eb, #16a34a, #8b5cf6
interaction.mode: 'index' (tooltip sincronizado)
```

---

### ETAPA 4 — Desempenho Individual

**Arquivo alvo:** `app/(app)/operadores/page.tsx`

**Componentes:**
```
<SeletorOperador />     → select com lista de operadores
<TabsMesPeriodo />      → "Mês Referência" | "Período Exato"
<BotoesAnalise />       → Analisar Desempenho | Gerar Folha
<KPIsOperador />        → Missões + Carga Horária
<GraficosOperador />    → Donut + Barras por categoria (igual BI)
<FolhaPonto />          → Tabela com múltiplas atividades por dia
```

**FolhaPonto — estrutura da tabela:**
```
Colunas: Data | Atividade | Início | Fim | Total
Data formato: DD/MM/AAAA

Por dia com múltiplas atividades:
  - Primeira linha: mostra a data
  - Demais linhas: data vazia (merged visual)
  - Após todas as linhas do dia: linha "TOTAL DO DIA: X:XXh"
    → background: rgba(249,115,22,0.06)
    → cor do valor: #f97316, font-weight 800
  - Separador de 6px entre dias

Rodapé: "TOTAL GERAL: 50:00h"
  → border-top 2px solid #1a237e
  → background: rgba(26,35,126,0.04)
```

**Query Supabase:**
```sql
SELECT
  r.data,
  a.nome as atividade,
  rp.hora_inicio,
  rp.hora_fim,
  rp.horas_totais
FROM relatorio_participantes rp
JOIN relatorios r ON r.id = rp.relatorio_id
JOIN atividades a ON a.id = r.atividade_id
WHERE rp.operador_id = $1
  AND r.data BETWEEN $2 AND $3
ORDER BY r.data, rp.hora_inicio
```

---

### ETAPA 5 — Missões (Diárias)

**Arquivo alvo:** `app/(app)/missoes/page.tsx`

**Formulário:**
```
Select: Operador
Grid 2 col: Qtd. Diárias (number, step 0.5) | Tipo da Missão (select)
Textarea: Observação / Descrição da Missão
Botão: "Registrar Missão" → bg #1a237e
```

**Ranking Consolidado — accordion:**
```
Cada operador = card com:
  - Linha clicável: Nome | Qtd diárias | Total R$  | ▼
  - Expandido: lista de missões individuais
    Cada missão: Tipo | Valor | Observação | [✏️ Editar] [🗑️ Excluir]
  - Editar: abre textarea inline para alterar observação
  - Excluir: confirm() → soft delete (deleted_at)
```

**Tabela Supabase:**
```sql
-- missoes
id, gaep_id, operador_id, qtd_diarias, tipo_missao,
valor_unitario_snapshot, valor_total, observacao,
data_missao, created_at, deleted_at
```

---

### ETAPA 6 — Módulo Gestão (Admin / Super Admin)

**Arquivo alvo:** `app/(app)/gestao/page.tsx`

**Abas por perfil:**
```
ADMIN:       👮 Efetivo | 📋 Atividades | 📅 Feriados | 🤖 Config IA | 💰 Diárias
SUPER_ADMIN: + 🌐 GAEPs (tab extra)
```

**Tab Efetivo:**
```
- Busca por nome (filter client-side)
- Lista com avatar inicial, nome, matrícula, equipe, tag de perfil
- Botão Editar → modal completo
- Botão Desativar → soft delete (deleted_at = now())
- Modal: Nome, Matrícula, Senha, Perfil (select), Equipe (select)
- Perfis: OPERADOR | SUPERVISOR | ADMIN | SUPER_ADMIN | AUDITOR
- Cores das tags:
  SUPER_ADMIN: #7c3aed | ADMIN: #1a237e | SUPERVISOR: #0369a1
  OPERADOR: #16a34a   | AUDITOR: #92400e
```

**Tab Config IA:**
```
- Select modelo: gpt-4o | gpt-4o-mini | gpt-4-turbo
- Slider temperatura: 0.1 → 1.0 (step 0.1), accentColor #1a237e
- Textarea prompt do sistema (font: monospace)
- Botão "🧪 Testar Prompt" → chama /api/ia com texto mock
- Botão "💾 Salvar Config" → salva em tabela config_ia
```

**Tab Diárias:**
```
ATENÇÃO: alteração de valor NÃO retroage (snapshot)
Mostrar vigência atual de cada tipo
Ao editar: registrar nova vigência com data de hoje
```

---

## 🗄️ Schema Supabase Resumido

Ver arquivo `sql/001_schema.sql` neste pacote.

---

## 📁 Arquivos de Referência

```
handoff/
├── README.md                  ← este arquivo
├── sql/
│   ├── 001_schema.sql         ← todas as tabelas
│   └── 002_seed.sql           ← dados iniciais (operadores, categorias)
├── prompts/
│   ├── claude-code-etapa1.md  ← prompt pronto para Login
│   ├── claude-code-etapa2.md  ← prompt pronto para Relatório
│   ├── claude-code-etapa3.md  ← prompt pronto para Painel BI
│   ├── claude-code-etapa4.md  ← prompt pronto para Desempenho
│   ├── claude-code-etapa5.md  ← prompt pronto para Missões
│   ├── claude-code-etapa6.md  ← prompt pronto para Gestão
│   └── cursor.md              ← prompt para Cursor (revisão de código)
├── tokens/
│   └── design-tokens.ts       ← tokens TypeScript prontos
└── design/
    ├── GAEP Prototype.html    ← protótipo completo
    ├── gaep-components.jsx    ← componentes de referência
    └── gaep-admin.jsx         ← módulo admin de referência
```
