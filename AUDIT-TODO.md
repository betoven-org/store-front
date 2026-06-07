# Auditoria Brasa CMS — Itens Pendentes

Consolidacao dos itens das 3 auditorias que ainda nao foram resolvidos.
Itens ja corrigidos nesta sessao estao marcados com [x].

## Resolvidos

- [x] **N1** — 404 padrao preta do Next → criado `admin/not-found.tsx` com layout do admin
- [x] **N2** — Link "Stripe" → renomeado para "Assinaturas" + empty state melhorado
- [x] **N3** — Busca case-sensitive → trocado `like` por `ilike` nas 4 queries
- [x] **N4** — Sino de notificacoes → popover funcional com paginas pendentes + badge dinamico
- [x] **N7** — Identidade vazia → bug: endpoint buscava `id=1` hardcoded, corrigido para `tenantId`
- [x] **N8** — Midias "--" ambiguo → substituido por "Sem tamanho" e "N/A"
- [x] **N9** — Toggle "Mostrar Area Restrita" → adicionado `@description` no JSDoc (re-extrair manifest)

---

## P0 — Bloqueadores

### #1 Analytics 500 + fallback ausente
- **Arquivo:** endpoint de analytics (verificar `/api/admin/analytics`)
- **Causa:** env vars `ANALYTICS_TOKEN` e `ANALYTICS_PROJECT_ID` ausentes
- **Correcao:** adicionar fallback gracioso quando env vars nao existem (mostrar estado vazio em vez de 500), e configurar as env vars em producao

### #2 Arquitetura tenant <> storefront
- **Problema:** Worker/proxy aponta para admin em vez do storefront do cliente
- **Decisao necessaria:** definir como o CMS roteia requests do storefront publico vs admin
- **Impacto:** bloqueia decisoes de dominio e preview

### #3 Preview do construtor em branco
- **Problema:** iframe de preview nao carrega o storefront
- **Causa provavel:** `frontendUrl` do tenant vazio ou CSP bloqueando iframe
- **Correcao:** verificar se `frontendUrl` esta populado, ajustar `frame-ancestors` no blog-medicinal

---

## P1 — Confiabilidade e UX

### #4 Refetch redundante de sessao/tenant/pages
- **Problema:** `get-session`, `tenant-info` e `pages/pending` sao chamados multiplas vezes na navegacao
- **Correcao:** centralizar em context providers com cache (SWR ou React Query), evitar re-fetch em cada pagina

### #5 Badge "dev" em producao
- **Arquivo:** `AdminHeader.tsx` — componente `DevEnvButton`
- **Correcao:** condicionar exibicao a `NODE_ENV === "development"` ou a uma flag do tenant

### #6 Grafico Analytics vazio + Bandwidth 0 B
- **Problema:** mesmo quando analytics funciona, graficos ficam vazios e bandwidth mostra 0
- **Correcao:** verificar se a API da Vercel retorna dados e implementar fallback visual

### #7 CSP ausente no admin
- **Problema:** Content-Security-Policy nao esta configurado no admin (store-front)
- **Correcao:** adicionar headers CSP no `next.config` do store-front, permitindo apenas origens necessarias

### #8 Linhas nao clicaveis em listas (U2)
- **Problema:** em Posts e Produtos, clicar na linha da tabela nao abre o item — so o kebab funciona
- **Correcao:** tornar toda a `<tr>` clicavel com `onClick={() => router.push(...)}` e `cursor-pointer`

### #9 Sem `<h1>` e `<title>` generico (U3)
- **Status:** parcialmente resolvido — `AdminShell` ja seta `document.title` e tem `<h1 className="sr-only">`
- **Pendente:** verificar se todas as paginas usam `AdminShell` com titulo correto

### #10 Botoes-icone e inputs sem nome acessivel (U4)
- **Problema:** alguns `<button>` com apenas icone nao tem `aria-label` ou `title`
- **Correcao:** audit de acessibilidade nos componentes de lista/tabela — adicionar `aria-label` onde falta

### #11 Kebab sobreposto a drawers (U8)
- **Problema:** menu kebab de uma linha aparece sobre o drawer/sheet quando aberto
- **Confirmado em:** Posts e Produtos
- **Correcao:** fechar kebab ao abrir drawer, ou ajustar `z-index` do drawer

### N5 — Categorias de produto sem acento
- **Problema:** dados no Supabase sem acento (Nutricosmetico, Saude, Dermocosmeticos)
- **Correcao:** rodar UPDATE no Supabase:
```sql
UPDATE product_categories SET name = 'Nutricosmetico' WHERE slug = 'nutricosmetico';
-- Atualizar com acentos corretos: Nutricosmetico, Dermocosmeticos, Saude
```
- Webhook sync vai propagar automaticamente para o Neon

### N6 — Inconsistencia de padroes (acoes/forms/imagens)
- **Problema 1:** Posts/Produtos usam kebab; Categorias/Autores usam icones inline
- **Problema 2:** Produtos abrem drawer; Categorias abrem pagina inteira
- **Problema 3:** Post tem campo de imagem de capa; Produto nao tem campo de imagem evidente
- **Correcao:** escolher um padrao e aplicar em todas as entidades

---

## P2 — Polish e consistencia

### #12 Acentuacao nos rotulos (tecnica #8 / U5)
- Labels e textos do admin sem acentos em varios lugares
- Fazer passada geral trocando "Pagina" → "Pagina", "Configuracoes" → etc.

### #13 Fontes/logo duplicados (tecnica #9)
- Verificar se ha carregamento duplicado de fontes (Geist carregando 2x)

### #14 HSTS sem includeSubDomains (tecnica #10)
- Adicionar `includeSubDomains` e `preload` no header HSTS

### #15 Produtos com categoria "---" (tecnica #11)
- Lista de produtos mostra "---" na coluna categoria quando produto nao tem categoria associada
- Substituir por texto descritivo ("Sem categoria")

### U7 — Empty states inconsistentes
- Criar componente `EmptyState` reutilizavel (icone + titulo + descricao + CTA opcional)
- Aplicar em: Assinaturas (feito), Lixeira, Produtos sem resultado, etc.

### U9 — Badge "dev" / "3 alteracoes" sem significado claro
- Badge "dev" precisa de tooltip ou contexto
- "3 alteracoes" ja linka pra /admin/publicar (ok), mas o dot animado pode confundir

### U11 — Contraste de muted texts
- Ja ajustado `--muted-foreground` de `oklch(0.58...)` para `oklch(0.46...)`
- Validar visualmente se o contraste esta suficiente em todos os contextos

### N11 — Loading: padronizar skeletons
- Admin usa spinner central em vez de skeletons
- Criar componente `Skeleton` e aplicar nas listas/cards para melhor perceived performance

---

## Componentes de design system sugeridos

Criar estes componentes resolve multiplos itens de uma vez:

| Componente | Resolve |
|---|---|
| `EmptyState` | U7, N10 |
| `ErrorState` | #1 (analytics fallback) |
| `Skeleton` | N11 |
| `IconButton` (com aria-label obrigatorio) | U4, #10 |

---

## Ordem sugerida de ataque

1. **P0 restantes** (#1 analytics, #3 preview) — #2 e decisao arquitetural
2. **P1 rapidos** (#5 badge dev, #8 linhas clicaveis, #11 kebab z-index)
3. **Design system** (EmptyState, Skeleton, IconButton) — resolve P2 em lote
4. **P2** com os componentes prontos
