# Brasa CMS — Roadmap para produto completo

## Visao

Tornar o Brasa CMS tao fluido e dinâmico quanto o deco.cx, mas com UX superior, multi-tenant nativo e billing integrado. O CMS deve ser o produto central — não um complemento.

---

## O que a deco faz que a gente precisa ter (ou superar)

### CORE: Page Builder / Editor Experience

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 1 | **Inline editing** — clicar no texto do preview e editar direto | Parcial (props panel) | Precisa de contenteditable no iframe | P0 |
| 2 | **Real-time preview** — alteração de prop reflete instantaneamente no preview | Tem, mas recarrega iframe | Usar postMessage pra patch incremental sem reload | P0 |
| 3 | **Section variants (A/B)** — mesma section com variantes e split % | Nao tem | Implementar flag system com matcher + random% | P1 |
| 4 | **Deferred/Lazy sections** — sections pesadas carregam sob demanda | Nao tem | Intersection Observer no SectionRenderer do frontend | P1 |
| 5 | **Widgets tipados** — ImageWidget, RichText, Color, DateWidget, Code, CSV, PDF, Video, Map | Parcial (text, textarea, select, image, toggle, richtext) | Adicionar: color picker, date/datetime, code editor, video, map | P1 |
| 6 | **Dynamic options** — select com opções vindas de um loader (ex: rotas do site) | Nao tem | Campo select que busca options de uma API | P2 |
| 7 | **Section search/filter** — buscar sections por nome/categoria no painel de adicionar | Basico | Adicionar categorias (Hero, Content, Commerce, Form, etc.) | P2 |
| 8 | **Copy/paste sections** — duplicar section entre paginas | Nao tem | Clipboard com JSON da section | P2 |
| 9 | **Collaborative editing** — PatchState com revision (OT/CRDT) | Nao tem | Futuro, mas registrar como diferencial planejado | P3 |

### CORE: SEO & Structured Data

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 10 | **SEO templates** — `%s | Nome do Site` para titulo/descricao | Nao tem | Implementar em site_settings + API | P0 |
| 11 | **JSON-LD automatico** — Article, Product, BreadcrumbList, FAQ | Nao tem | Gerar no SDK baseado no tipo da pagina | P1 |
| 12 | **SEO preview** — como vai aparecer no Google, Twitter, WhatsApp, Discord | Nao tem (só meta fields) | Componente de preview tipo a deco (_seo/Preview, Google, Twitter, WhatsApp) | P1 |
| 13 | **Open Graph config** — OG separado do meta principal | Parcial (og_title, og_description) | Adicionar og_image separado + Twitter card config | P2 |
| 14 | **noIndexing toggle** — desativar indexacao por pagina | Nao tem | Flag na pagina + robots meta | P2 |
| 15 | **Canonical URL** — setar por pagina | Nao tem (só posts) | Estender pra todas as pages | P2 |

### CORE: Redirects & Routing

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 16 | **Redirects manager** — tabela from/to com 301/302 | Nao tem | Tabela `redirects` + middleware match + UI admin | P1 |
| 17 | **Import redirects CSV** — upload CSV com redirects em massa | Nao tem | Parser CSV na UI | P2 |
| 18 | **Wildcard redirects** — `/blog/*` → `/posts/*` | Nao tem | Pattern matching com * no middleware | P2 |

### CORE: Audiences & Personalizacao

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 19 | **Matchers** — device, location, cookie, queryString, userAgent, cron, random% | Nao tem | Sistema de matchers com avaliacao server-side | P1 |
| 20 | **Audiences** — segmentos nomeados (Mobile Users, SP Region, etc.) | Nao tem | Combinacao de matchers = audience | P2 |
| 21 | **Conteudo condicional** — section X aparece só pra audience Y | Nao tem | Flag no manifest por section | P2 |

### INTEGRAÇÕES

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 22 | **Resend (email transacional)** — welcome, NF, avisos | Nao tem | API route + templates | P1 |
| 23 | **Algolia/Typesense search** — busca fulltext profissional no frontend | Basico (busca no DB) | Integrar search engine externo | P2 |
| 24 | **PostHog analytics** — session replay, funnels, feature flags | Nao tem (só request metrics) | Injetar script + dashboard basico | P2 |
| 25 | **HubSpot/RD Station** — forms do CMS alimentam CRM | Nao tem | Webhook on form submit → CRM API | P2 |
| 26 | **Unsplash integration** — buscar imagens stock direto na media library | Nao tem | Tab "Stock" na MediaLibrary com Unsplash API | P2 |
| 27 | **AI content generation** — gerar texto, resumos, SEO descriptions com AI | Nao tem | Botao ✨ nos campos text/richtext que chama OpenAI | P1 |

### UX DO ADMIN (fluidez)

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 28 | **Command palette global** — ⌘K pra navegar, buscar, executar acoes | Tem (GlobalSearch) | Expandir com acoes (criar post, publicar, ir pra pagina) | P1 |
| 29 | **Autosave** — salvar draft automaticamente a cada 30s de inatividade | Nao tem (só ⌘S) | debounce de 30s → PATCH draft | P0 |
| 30 | **Undo/Redo visual** — ver o que vai ser desfeito antes de desfazer | Tem undo (50 niveis) | Tooltip com preview do que muda | P2 |
| 31 | **Breadcrumb de navegacao** — saber onde esta (Pages > Home > Editing) | Nao tem | Breadcrumb no AdminHeader | P2 |
| 32 | **Onboarding wizard** — primeiro acesso guia o usuario passo a passo | Nao tem | Checklist: nome do site → logo → primeira pagina → publicar | P1 |
| 33 | **Activity log** — quem fez o que e quando | Nao tem | Tabela `activity_log` (user, action, entity, timestamp) | P2 |
| 34 | **Notifications/alerts** — avisar sobre trial expirando, sync falhando | Nao tem | Toast system + bell icon com lista | P2 |
| 35 | **Dark mode** — toggle light/dark | Nao tem (só light) | CSS variables ja sao OKLch, basta trocar valores | P3 |

### MULTI-TENANT & BILLING

| # | Feature | Status Brasa | Gap | Prioridade |
|---|---------|-------------|-----|-----------|
| 36 | **Super-admin dashboard** — ver todos os tenants, status, receita | Nao tem | Rota /superadmin com overview de tenants | P1 |
| 37 | **Planos diferenciados** — Starter (blog), Pro (page builder), Enterprise | Nao tem (só R$550) | Tabela `plans` com limites (pages, sections, storage) | P2 |
| 38 | **Usage limits** — limitar por plano (ex: 5 paginas no Starter) | Nao tem | Check no middleware/API antes de criar | P2 |
| 39 | **White-label** — tenant customiza cores/logo do admin | Nao tem | Ler theme do tenant e aplicar no admin | P3 |
| 40 | **Custom domains** — tenant usa cms.seudominio.com | Parcial (campo domain) | Verificacao DNS + SSL automatico (Vercel/Cloudflare) | P2 |

---

## Ordem de execucao sugerida

### Sprint 1 — Fluidez do Editor (torna o CMS viciante)
- [x] #29 Autosave (30s debounce) ✓
- [x] #2 Preview sem reload (postMessage patch) ✓
- [x] #1 Inline editing basico (texto) ✓ (já existia)
- [x] #10 SEO templates (%s) ✓
- [x] #32 Onboarding wizard ✓

### Sprint 2 — SEO & Profissionalismo
- [ ] #11 JSON-LD automatico
- [x] #12 SEO preview (Google/Social) ✓ (tab SEO no editor)
- [x] #16 Redirects manager ✓
- [x] #5 Widgets: color, date, video ✓
- [x] #27 AI content generation (OpenAI) ✓ + sistema de creditos

### Sprint 3 — Personalizacao & Growth
- [x] #3 Section variants (A/B) ✓ (schema pronto, falta UI de config)
- [ ] #19 Matchers (device, random%)
- [x] #22 Resend email ✓
- [ ] #36 Super-admin dashboard
- [ ] #28 Command palette expandido

### Sprint 4 — Integracoes & Scale
- [x] #4 Lazy/Deferred sections ✓ (flag no SectionBlock)
- [x] #23 Search engine (Algolia/Typesense) ✓
- [ ] #24 PostHog analytics (script injection)
- [x] #26 Unsplash na media library ✓ (API pronta, falta UI tab)
- [ ] #37 Planos diferenciados

### Sprint 5 — Polish & Enterprise
- [ ] #17 Import redirects CSV
- [ ] #20 Audiences
- [ ] #21 Conteudo condicional
- [ ] #33 Activity log
- [ ] #39 White-label
- [ ] #40 Custom domains com SSL

### Extras implementados (fora do roadmap original)
- [x] Stripe billing R$550/mês + CPF/CNPJ
- [x] Self-service signup + 7 dias trial
- [x] Bloqueio de sync quando inadimplente
- [x] Theme editor (cores OKLch, fontes, radius)
- [x] Section schema system (defineSection + extractor)
- [x] Editor split panel (estilo deco)
- [x] Preview com dados reais (posts, categorias, produtos)
- [x] Integrações: OpenAI, Unsplash, Resend, Slack, Algolia/Typesense
- [x] Sistema de créditos de AI (50 grátis, debita por uso)
- [x] Notificação Slack automática no publish
- [x] BrasaLoader unificado (formas geométricas)

---

## Diferenciais do Brasa vs Deco

| Brasa CMS | deco.cx |
|-----------|---------|
| Multi-tenant nativo com billing | Single-tenant, pricing opaco |
| Self-service signup + trial | Precisa de contato comercial |
| Next.js (ecossistema enorme) | Deno/Fresh (ecossistema menor) |
| Neon + Supabase (escala vertical) | Deno Deploy (vendor lock-in) |
| Stripe billing integrado | Sem billing self-service |
| R$550/mes acessivel | ~R$2000+/mes enterprise |
| Open para qualquer frontend | Amarrado ao runtime deco |

## Onde a deco ainda ganha (gaps criticos)

1. **Editor inline no preview** — clicar e editar direto
2. **A/B testing nativo** — variantes com split automatico
3. **Collaborative real-time** — multiplos editores no mesmo doc
4. **Type-safe sections** — props derivadas do TypeScript auto-geram o form
5. **Ecosystem de apps** — 90+ integracoes prontas

---

---

## Como a deco funciona por baixo (insights do core `deco-cx/deco`)

### Arquitetura do editor

```
Admin (browser)                    Runtime (server)
┌─────────────────────┐           ┌────────────────────────┐
│  Form auto-gerado   │──patch──→│  Decofile (JSON state)  │
│  (JSON Schema)      │←─event──│  Versionado + realtime   │
│  Preview iframe     │           │  Revision-based (CRDT)  │
└─────────────────────┘           └────────────────────────┘
        ↓                                    ↓
   postMessage                        Section resolver
   (props update)                     (loader + component)
        ↓                                    ↓
┌─────────────────────┐           ┌────────────────────────┐
│  Preview re-render  │           │  Production render      │
│  (sem page reload)  │           │  (cached, CDN)          │
└─────────────────────┘           └────────────────────────┘
```

### Conceitos-chave pra replicar

1. **Decofile** = JSON gigante versionado com todas as pages/sections/props
   - Brasa equivalente: nosso `manifest` (já temos draft_manifest vs manifest)
   - Gap: não temos realtime subscription nem JSON Patch

2. **Schema auto-generation** = TypeScript types → JSON Schema → form gerado automaticamente
   - Na deco: `engine/schema/schemeable.ts` gera JSON Schema de qualquer type
   - Brasa equivalente: nosso `SectionEditor` com schema manual por section
   - Gap: forms são manuais; deveriamos gerar do schema da section

3. **Widgets** = annotations no type que definem o widget do form
   - `@format image-uri` → ImageWidget (upload)
   - `@format rich-text` → RichText editor
   - `@format color-input` → Color picker
   - `@format code` + `@language css` → Code editor
   - `@format html` → HTML editor
   - `@format map` → Map picker
   - `@format date` → Date picker
   - Brasa: implementar widget registry baseado em `type` do schema

4. **Section = Component + Loader + LoadingFallback + ErrorFallback**
   - Cada section pode ter um `loader()` que busca dados server-side
   - `LoadingFallback` renderiza skeleton enquanto carrega
   - `ErrorFallback` renderiza erro gracioso
   - Brasa: hoje sections são puramente client-side com props estaticas

5. **Multivariate (A/B)** = Section envelopada com variantes + matcher
   - `MultivariateProps<Section>` = array de variantes com peso
   - Matcher avalia server-side (device, random%, etc.) e resolve a variante
   - Zero JS no client pra A/B — tudo server-side

6. **Realtime sync** = WebSocket/subscription com JSON Patch (RFC 6902)
   - Editor faz `PatchState` → server aplica → broadcasteia `StatePatched`
   - Permite collaborative editing (multiplos editores)
   - Brasa: podemos usar Supabase Realtime pra isso

### O que isso significa pro Brasa CMS

O caminho pra fluidez maxima:

1. **Schema-driven forms** — sections exportam um JSON Schema, o editor gera o form automaticamente (sem SectionEditor manual)
2. **postMessage preview** — quando prop muda, manda pro iframe via postMessage ao invés de recarregar
3. **Manifest como state tree** — tratar o manifest como source of truth versionada (já temos draft_manifest, falta realtime)
4. **Loader pattern** — sections com data fetching server-side (SSR) + skeleton fallback
5. **Widget registry** — mapear tipos de prop pra widgets (string → input, ImageWidget → upload, RichText → tiptap, Color → picker, etc.)

---

## Meta

> Quando os itens P0 + Sprint 1 estiverem feitos, o CMS ja compete com a deco em fluidez.
> Sprint 2 + 3 fazem dele um produto vendavel como SaaS.
> Sprint 4 + 5 = enterprise-ready.
