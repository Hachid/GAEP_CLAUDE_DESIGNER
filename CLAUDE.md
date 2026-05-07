# CLAUDE.md — Ponteiro de contexto

> Este arquivo é lido automaticamente pelo Claude Code ao abrir o repo.
> O contexto **vivo** deste projeto está fora do repo, no vault Obsidian.

## Antes de qualquer ação, leia (nesta ordem):

1. `C:\Projetos\claude-projects\projetos\sistema-gaep\SPEC.md` — escopo, objetivo, requisitos.
2. `C:\Projetos\claude-projects\projetos\sistema-gaep\PROGRESSO.md` — última sessão, decisões, próximos passos.
3. `C:\Projetos\claude-projects\projetos\sistema-gaep\ARQUITETURA.md` — apenas se a tarefa toca arquitetura/DB/fluxos.
4. `./handoff/README.md` — fonte da verdade do design (6 etapas).

## Regras desta sessão

- **NÃO** leia arquivos de outros projetos do vault (`whatsapp-bot/`, `erp-local/`, `thermal-camera/`). Eles não têm relação com este repo.
- **NÃO** explore o repo inteiro às cegas. Use os 4 arquivos acima como contexto suficiente; só leia outros sob demanda específica.
- **Ao final da sessão**: atualize `C:\Projetos\claude-projects\projetos\sistema-gaep\PROGRESSO.md` com data de hoje, o que foi feito, decisões e próximos passos. Se houve decisão arquitetural, adicione um ADR em `notas/decisoes/`.

## Convenções deste projeto

- Mobile-first 375–430px, touch targets ≥ 44px.
- Sem `any` em TypeScript.
- Sempre **soft delete** (`deleted_at`), nunca `DELETE` físico.
- Use os tokens em `handoff/tokens/design-tokens.ts` — não invente cores.
- Soft delete e snapshot de valor (diárias) são invariantes do domínio.
