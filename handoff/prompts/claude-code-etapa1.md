# 🛡️ PROMPT — ETAPA 1: Tela de Login
## Cole este prompt no Claude Code

---

Vou implementar a **Etapa 1 do Sistema GAEP**: Tela de Login.

Siga rigorosamente o `CLAUDE.md` do projeto (TDD, soft delete, audit log, Conventional Commits).

## Contexto
Tenho o protótipo aprovado em `handoff/design/GAEP Prototype.html`.
A tela de login está implementada lá como referência visual exata.
**Meu objetivo é recriar essa tela em Next.js/TypeScript sem quebrar o que já existe.**

## O que precisa ser feito

### 1. Schema Supabase
Execute o SQL em `handoff/sql/001_schema.sql` no seu banco.
Depois execute `handoff/sql/002_seed.sql` para dados iniciais.

### 2. Tokens de Design
Cole `handoff/tokens/design-tokens.ts` em `lib/design-tokens.ts`.
Atualize o `tailwind.config.ts` com as cores do token.

### 3. Tela de Login (`app/(auth)/login/page.tsx`)

**Design exato (replicar pixel-perfect):**
- Fundo: `#f2f2f2`
- Logo: `<Image src="/gaep-logo.png" width={120} height={120} style={{ objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.18))' }} />`
- Título: "GAEP-CAT" — font-size 1.9rem, font-weight 900, letter-spacing 2px, color #1a237e
- Subtítulo: "Gestão de Atividades e Efetivo Policial"
- Card branco: border-radius 20px, padding 28px 24px, box-shadow 0 20px 60px rgba(0,0,0,0.3)
- Select: lista de operadores.nome do Supabase (ordem alfabética)
- Input: type="password", placeholder="Digite sua matrícula"
- Botão: "Acessar Sistema", bg #1a237e, full-width, padding 14px, font-weight 700

**Lógica de autenticação:**
```typescript
// Supabase Auth com email virtual: {matricula}@gaep.internal
const { error } = await supabase.auth.signInWithPassword({
  email: `${matricula}@gaep.internal`,
  password: senha
})
// Redirect para /relatorio após login bem-sucedido
// Sessão sem expiração automática
```

**Estados obrigatórios:**
- Loading: botão desabilitado + "⏳ Verificando..."
- Erro: mensagem vermelha abaixo do botão
- Senha padrão inicial = matricula do operador (ex: "001")

### 4. Middleware de proteção de rotas
```typescript
// middleware.ts — proteger /app/* exigindo sessão ativa
```

### 5. Assets
Copie `handoff/design/GAEP-Logo.png` para `public/gaep-logo.png`.

## Workflow TDD obrigatório
1. Liste os casos de teste antes de escrever código
2. Escreva os testes (RED)
3. Implemente (GREEN)
4. Commit: `feat(auth): implementar tela de login com Supabase Auth`

## Referência visual
Abra `handoff/design/GAEP Prototype.html` no browser para ver o design exato.
Clique em qualquer operador + senha "1234" para ver o flow completo.

## ⚠️ Regras
- NÃO apagar arquivos existentes
- NÃO alterar rotas que já funcionam
- Soft delete em tudo (deleted_at)
- TypeScript strict, sem `any`
