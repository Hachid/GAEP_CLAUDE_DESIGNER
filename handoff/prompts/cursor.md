# 🖥️ PROMPT — Cursor (Revisão de Código)
## Use no Cursor para revisão e ajustes finos de design

---

## Contexto
Estou implementando o Sistema GAEP em Next.js 14 + TypeScript + Tailwind CSS + Supabase.
Tenho um protótipo de design aprovado que devo seguir pixel-perfect.
O protótipo está em `handoff/design/GAEP Prototype.html`.

## Design Tokens (use sempre estes valores)

```
Cores principais:
  Primary:  #1a237e  (azul GAEP)
  Accent:   #2563eb  (botão IA)
  Orange:   #f97316  (destaques, carga horária)
  Green:    #16a34a  (sucesso, salvar)
  Danger:   #ef4444  (erros, excluir)
  Purple:   #7c3aed  (Super Admin)
  Bg:       #f3f4f6
  Surface:  #ffffff
  Border:   #e2e8f0
  Text:     #1e293b
  Muted:    #64748b

Fontes: 'Segoe UI', Roboto, Helvetica, sans-serif
Border-radius padrão: 10-12px para cards, 8px para inputs, 30px para chips
```

## Tarefa para o Cursor

Quando eu te mostrar um componente que diverge do protótipo, sua tarefa é:

1. **Identificar a divergência** — o que está diferente do protótipo
2. **Corrigir o CSS/Tailwind** para ficar fiel ao design
3. **Não alterar** a lógica de negócio, apenas o visual
4. **Usar os tokens** acima — nunca inventar cores novas

## Padrões de componente a seguir

### Input padrão
```tsx
<input className="w-full px-3 py-3 bg-[#f3f4f6] border border-[#e2e8f0] rounded-[10px] text-[#1e293b] text-[15px] outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all" />
```

### Botão primário
```tsx
<button className="w-full py-4 bg-primary text-white rounded-[10px] font-bold text-sm uppercase tracking-wide shadow-[0_4px_14px_rgba(26,35,126,0.25)] hover:bg-primary-dark transition-all disabled:bg-gray-300 disabled:cursor-not-allowed">
```

### Card BI
```tsx
<div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_12px_rgba(0,0,0,0.04)] p-[18px] mb-5">
```

### Chip de equipe (ativo)
```tsx
// Ativo:   bg-primary text-white border-primary
// Inativo: bg-white text-[#64748b] border-[#e2e8f0]
<div className="px-3 py-2 rounded-full text-[14px] font-semibold cursor-pointer transition-all select-none border">
```

### Label uppercase
```tsx
<label className="block text-[11px] font-bold uppercase text-[#64748b] tracking-[0.5px] mb-1.5">
```

## Regras de revisão
- Mobile-first: viewport 375px é o padrão
- Touch targets mínimos: 44px de altura
- Nunca usar `any` no TypeScript
- Sempre soft delete (deleted_at), nunca DELETE físico
- Animações: `animation: fadeIn 0.3s ease` para elementos que aparecem
