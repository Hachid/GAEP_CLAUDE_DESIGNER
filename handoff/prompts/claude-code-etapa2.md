# 🛡️ PROMPT — ETAPA 2: Registro de Operação (Relatório)
## Cole este prompt no Claude Code APÓS a Etapa 1 estar funcionando

---

Etapa 1 (Login) está funcionando. Vou implementar a **Etapa 2: Tela de Registro de Operação**.

Siga o `CLAUDE.md` (TDD completo, soft delete, audit log).

## Arquivo alvo
`app/(app)/relatorio/page.tsx`

## Componentes a criar em `components/relatorio/`

### `DateTimeBlock.tsx`
Card unificado branco com:
- Linha 1: ícone 📅 + label "DATA DO TURNO" + `<input type="date">`
- Linha 2 (grid 2col): ⏱ INÍCIO `<input type="time">` | 🏁 TÉRMINO `<input type="time">`
- Linha 3 (condicional): "⏳ Duração: Xh" em laranja (#f97316) — só quando calculado
- Border: 1px solid #e2e8f0, border-radius 14px, overflow hidden

### `EquipeChips.tsx`
- Inicia com TODOS selecionados (`useState([...operadores])`)
- Chip TODOS: sempre com borda #1a237e; ativo = bg #1a237e text branco
- Chips individuais: ativo = bg #1a237e text branco; inativo = bg branco text #64748b
- Contador "(12)" ao lado do label
- Ao clicar individual → desativa "TODOS", toggling individual
- Ao clicar TODOS → seleciona/deseleciona todos

### `FotoUpload.tsx`
- Área dashed (border: 2px dashed #e2e8f0)
- Máx. 3 fotos, accept="image/*"
- Upload para Supabase Storage: `gaep-cat/fotos/DD-MM-AAAA_CATEGORIA_ATIVIDADE_N.jpg`
- Preview das fotos selecionadas (thumbnails 65x65px)

### `DescricaoMic.tsx`
- Textarea com padding-right 60px para o botão do microfone
- Botão mic flutuante (bottom:10px, right:10px): círculo azul #2563eb, 42px
- Web Speech API: `SpeechRecognition` — ao gravar, bg vermelho + pulse animation
- SVG do microfone inline (igual ao protótipo)

### `BotoesAcao.tsx`
- Grid 2 colunas: "💾 Salvar Direto" (bg #64748b) | "✨ Redigir com IA" (bg #2563eb)
- Loading state no botão IA: "⏳ Redigindo..." + disabled

### `AreaRevisao.tsx`
- Aparece após retorno da IA (animação fadeIn)
- Background: rgba(37,99,235,0.05), border 1px solid rgba(37,99,235,0.2)
- Textarea "Texto Oficial Revisado" (label azul)
- Textarea "Observações" (label laranja)
- Botão "Salvar & Consolidar Turno" (bg #1a237e)

## API Route: `app/api/ia/route.ts`
```typescript
// Chama GPT-4o com o prompt cadastrado no config_ia do GAEP
// Recebe: { data, horario, categoria, atividade, equipe, descricaoBruta }
// Retorna: { descricaoRevisada: string }
```

## Salvar no Supabase
```typescript
// 1. INSERT relatorios (com todos os campos)
// 2. INSERT relatorio_participantes (um por operador da equipe)
// 3. INSERT audit_log
// 4. Upload fotos para Storage (se houver)
```

## Workflow TDD
Commits esperados:
- `feat(relatorio): criar componente DateTimeBlock`
- `feat(relatorio): criar componente EquipeChips`
- `feat(relatorio): criar upload de fotos com Supabase Storage`
- `feat(relatorio): integrar GPT-4o via /api/ia`
- `feat(relatorio): salvar relatório no banco com participantes`

## Referência visual
`handoff/design/GAEP Prototype.html` → tela "Relatório" (primeira após login)
