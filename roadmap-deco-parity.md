# Brasa CMS — Roadmap de Paridade com deco.cx

> Analise feita em 2026-06-14. Fonte: `deco-cx/deco` + `deco-cx/apps` (Apache-2.0).
> Stack deco: Deno + Fresh + Preact. Stack Brasa: Next.js 15 + React + Drizzle + Neon.
> Estrategia: copiar logica/algoritmos/tipos do deco e adaptar para nossa arquitetura.

---

## Legenda

- **[COPIAR]** — Logica existe pronta no deco, adaptar para Next.js/React
- **[INSPIRAR]** — Conceito do deco, implementacao propria
- **[NOVO]** — Nao existe no deco, criacao nossa
- Complexidade: `S` (1-2 dias), `M` (3-5 dias), `L` (1-2 semanas), `XL` (2+ semanas)

---

## O que JA TEMOS (paridade ou superior)

| Feature | Brasa CMS | deco.cx | Status |
|---|---|---|---|
| Page Builder | Drag-and-drop (@dnd-kit), section library, templates | Section array + admin editor | Paridade |
| Section System | `defineSection()` + loaders | TypeScript Props + loaders | Paridade |
| Preview | iframe proxy, responsivo | PostMessage + iframe | Paridade |
| Content Types | Posts, Products, Categories, Authors, Collections | Blog, Commerce (via apps) | Superior |
| Media Library | Upload, crop, blurhash, 3 tamanhos, Supabase Storage | File tree JSON + Image CDN | Paridade (falta CDN) |
| Auth & Roles | 4 roles (admin/editor/author/viewer), NextAuth | GitHub-based, roles basicos | Superior |
| Database | 29 tabelas, Drizzle ORM, Neon | Git-based (decofile JSON) | Superior para CMS |
| SDK tipado | `@brasa/core`, Zod validation | TypeScript invoke | Paridade |
| Theme/Tokens | OKLch CSS vars, Geist fonts | CSS vars + Google Fonts | Paridade |
| SEO | Per-page, per-post, global, OG, meta, canonical | Full SEO + JSON-LD + previews | Quase (falta previews) |
| Redirects | 301/302, admin UI | 301/307, CSV import, params | Quase (falta CSV bulk) |
| Sitemap | Auto-generated XML | Auto-generated XML | Paridade |
| Version History | `page_versions` table, rollback | Git commits | Paridade |
| Scheduled Publishing | `scheduledAt` + cron job | Nao nativo | Superior |
| Forms | Custom fields, submissions, email notify | Nao nativo (via apps) | Superior |
| Newsletter | Subscribers, consent, Resend | Nao nativo | Superior |
| Trash/Soft Delete | 30-day grace, restore | Git revert | Superior |
| Multi-tenant | Tenant isolation, domains, subdomains | Repo por site | Superior |
| Billing | Stripe subscriptions, portal | SaaS pricing externo | Superior |
| AI Content | Generation + credits + usage log | Via apps (OpenAI/Anthropic) | Superior |
| Global Sections | Header/Footer globais | Global sections array | Paridade |
| Search | Full-text (tsvector) | Nao nativo | Superior |
| Analytics Dashboard | Metrics, traffic, latency, error rate | OneDollarStats (Clickhouse) | Paridade |
| Robots.txt | Editor no admin | Nao nativo | Superior |
| RSS Feed | `/api/v1/feed` | Nao nativo | Superior |
| Batch Operations | Bulk CRUD, bulk publish/discard | Nao nativo | Superior |
| Sync Integrations | Supabase<->Neon webhook + cron | Git-based | Unico |

---

## Sprint 1 — Quick Wins

### 1.1 SEO Preview Renderers `[COPIAR]` `S`

**O que faz:** Preview visual de como o link aparece no Google, Facebook, Twitter, LinkedIn, Discord, Slack, Telegram, WhatsApp.

**Fonte deco:**
- `apps/website/components/Seo.tsx` — componente SEO completo
- `apps/website/sections/Seo/SeoV2.tsx` — versao atualizada

**Implementacao:**
- [ ] Criar componente `SeoPreview.tsx` com tabs (Google, Facebook, Twitter, LinkedIn, WhatsApp)
- [ ] Cada tab renderiza um mockup visual do snippet com os dados reais da pagina/post
- [ ] Integrar no editor de paginas, posts e produtos
- [ ] Validacoes: titulo max 60 chars, description max 160 chars, OG image aspect ratio

**Onde integrar:**
- `/admin/paginas/[id]` — aba SEO
- `/admin/posts/[id]` — sidebar SEO
- `/admin/produtos/[id]` — sidebar SEO

---

### 1.2 Redirects Bulk (CSV Import) `[COPIAR]` `S`

**O que faz:** Upload de CSV com centenas de redirects de uma vez. Suporte a parametros dinamicos e preservacao de query string.

**Fonte deco:**
- `apps/website/loaders/redirectsFromCsv.ts` — loader que parseia CSV de redirects
- `apps/website/loaders/redirect.ts` — redirect com `:param` replacement
- `apps/website/handlers/redirect.ts` — handler com query string preservation

**Implementacao:**
- [ ] Endpoint `POST /api/admin/redirects/import` — aceita CSV (from,to,type)
- [ ] Parser CSV com validacao (Zod: from_path, to_path, type 301|302)
- [ ] UI de upload na pagina `/admin/redirects` com preview da tabela antes de importar
- [ ] Suporte a `:param` dinamicos nos paths (ex: `/old/:slug` -> `/new/:slug`)
- [ ] Opcao de preservar query string no redirect
- [ ] Export CSV dos redirects existentes

**Tabela existente:** `redirects` — adicionar campo `preserveQueryString: boolean`

---

### 1.3 Deferred/Lazy Sections `[COPIAR]` `M`

**O que faz:** Sections abaixo do fold carregam sob demanda (intersection observer). Reduz TTI e melhora LCP.

**Fonte deco:**
- `apps/website/sections/Rendering/Deferred.tsx` — section wrapper com lazy loading
- `apps/website/sections/Rendering/Lazy.tsx` — renderiza LoadingFallback, substitui com conteudo real
- `deco/hooks/usePartialSection.ts` — HTMX-style partial replacement

**Implementacao:**
- [ ] Criar prop `loading: "eager" | "lazy"` no schema de sections
- [ ] Componente `DeferredSection` no frontend que:
  - Renderiza placeholder/skeleton inicialmente
  - Usa IntersectionObserver para detectar visibilidade
  - Faz fetch do HTML da section via API quando visivel
  - Substitui placeholder pelo conteudo real
- [ ] Endpoint `GET /api/v1/sections/render` — renderiza section individual por ID
- [ ] Configuracao no Page Builder: toggle "Lazy load" por section
- [ ] Timeout configuravel e fallback para erro de rede

**Impacto em performance:** Sections como FAQ, Testimonials, Footer podem carregar lazy.

---

## Sprint 2 — Image CDN

### 2.1 Image Optimization Service `[COPIAR]` `M`

**O que faz:** CDN que otimiza imagens on-the-fly: resize, format conversion (WebP/AVIF), quality presets, srcset automatico.

**Fonte deco:**
- `apps/website/components/Image.tsx` — componente Image com srcset 1x/2x, preload, fetchPriority
- `apps/website/components/Picture.tsx` — responsive picture com source sets
- `apps/website/loaders/image.ts` — image loader com engines (Cloudflare, deco CDN, WASM, passthrough)

**Implementacao:**
- [ ] Rota `/api/v1/image` — proxy de otimizacao de imagem
  - Params: `src`, `width`, `height`, `quality` (low 60/medium 70/high 80/original 100), `fit` (cover/contain), `format` (auto/webp/avif)
  - Cache headers: `Cache-Control: public, max-age=31536000, immutable`
  - Backend: `sharp` (Node.js) ou Vercel Image Optimization (`next/image` loader)
- [ ] Componente `<OptimizedImage>` para o SDK frontend
  - Gera srcset automatico (1x, 2x)
  - Props: `preload`, `fetchPriority`, `loading` (eager/lazy)
  - Suporte a `<picture>` com source sets por breakpoint
- [ ] Quality presets configuraveis no tema do tenant
- [ ] Integracao com Media Library: gerar URLs otimizadas automaticamente
- [ ] Fallback: se o servico falhar, serve imagem original

**Opcao simplificada:** Usar Vercel Image Optimization (ja temos Next.js) + componente wrapper.

---

## Sprint 3 — Personalizacao e Experimentos

### 3.1 Matchers (Targeting Engine) `[COPIAR]` `L`

**O que faz:** Sistema de condicoes booleanas que avaliam se um visitante pertence a um segmento. Base para feature flags e A/B tests.

**Fonte deco:**
- `deco/blocks/matcher.ts` — block type para matchers
- `apps/website/matchers/` — 15+ matchers prontos:
  - `always.ts`, `never.ts` — sempre true/false
  - `negate.ts` — inverte outro matcher
  - `multi.ts` — composicao AND/OR de matchers
  - `device.ts` — mobile/tablet/desktop
  - `location.ts` — cidade/regiao/pais/coordenada+raio
  - `date.ts` — range de data/hora
  - `cron.ts` — cron expression
  - `random.ts` — % de trafego com sticky session
  - `cookie.ts` — valor de cookie
  - `pathname.ts` — pattern de URL
  - `queryString.ts` — parametro de query
  - `host.ts` — dominio
  - `userAgent.ts` — browser/bot

**Implementacao:**

```sql
CREATE TABLE matchers (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Definir interface `Matcher` e `MatcherContext` (request, cookies, geo, UA)
- [ ] Implementar matchers core (copiar logica do deco, adaptar para Node):
  - [ ] `device` — parser de User-Agent
  - [ ] `random` — traffic split com cookie sticky
  - [ ] `date` — date range check
  - [ ] `pathname` — URL pattern matching
  - [ ] `cookie` — cookie value check
  - [ ] `queryString` — query param check
  - [ ] `location` — geo lookup (Vercel `x-vercel-ip-*` headers)
  - [ ] `userAgent` — regex match
  - [ ] `multi` — AND/OR composition
  - [ ] `negate` — inverter resultado
- [ ] API CRUD: `POST/GET/PATCH/DELETE /api/admin/matchers`
- [ ] UI no admin: `/admin/segmentos` — criar e gerenciar matchers
- [ ] Avaliacao server-side no middleware Next.js (rapido, antes do render)

---

### 3.2 Feature Flags `[COPIAR]` `L`

**O que faz:** Flags booleanas ou multivariantes controladas por matchers. Ativa/desativa funcionalidades para segmentos especificos.

**Fonte deco:**
- `deco/blocks/flag.ts` — FlagObj com matcher + true/false values
- `apps/website/flags/audience.ts` — audience targeting
- `apps/website/flags/multivariate/` — variantes multiplas (page, section, image, message)

**Implementacao:**

```sql
CREATE TABLE flags (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  key VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'boolean',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);

CREATE TABLE flag_variants (
  id SERIAL PRIMARY KEY,
  flag_id INT NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  matcher_id INT REFERENCES matchers(id),
  weight INT DEFAULT 100,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Avaliacao sequencial: primeiro matcher que da true -> retorna o variant value
- [ ] Variant sem matcher = fallback/default
- [ ] API CRUD: `/api/admin/flags` e `/api/admin/flags/[id]/variants`
- [ ] SDK frontend: `useFlag(key)` hook que resolve flag via API ou cookie
- [ ] Middleware Next.js: avalia flags e injeta no request context
- [ ] UI no admin: `/admin/flags` — lista, criar, editar flags + atribuir matchers

---

### 3.3 A/B Testing / Experiments `[COPIAR]` `L`

**O que faz:** Testa variantes de paginas, sections, imagens ou textos com divisao de trafego e tracking de conversoes.

**Fonte deco:**
- `apps/website/flags/multivariate/page.ts` — A/B test de paginas inteiras
- `apps/website/flags/multivariate/section.ts` — A/B test de sections individuais
- `apps/website/flags/multivariate/image.ts` — A/B test de imagens
- `apps/website/flags/multivariate/message.ts` — A/B test de texto
- `deco/utils/segment.ts` — segment hash para cache por variante

**Implementacao:**

```sql
CREATE TABLE experiments (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL, -- page, section, image, message
  flag_id INT NOT NULL REFERENCES flags(id),
  status VARCHAR(20) DEFAULT 'draft', -- draft, running, paused, completed
  goal VARCHAR(50), -- click, conversion, pageview, bounce_rate
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE experiment_results (
  id SERIAL PRIMARY KEY,
  experiment_id INT NOT NULL REFERENCES experiments(id),
  variant_id INT NOT NULL REFERENCES flag_variants(id),
  impressions INT DEFAULT 0,
  conversions INT DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_time_on_page INT,
  recorded_at DATE NOT NULL,
  UNIQUE(experiment_id, variant_id, recorded_at)
);
```

- [ ] Criar experimento vincula a uma flag multivariate com matcher `random`
- [ ] Tracking: pixel/beacon que registra impressoes e conversoes por variante
- [ ] Dashboard do experimento: grafico de conversao por variante, statistical significance
- [ ] Endpoint: `POST /api/v1/experiments/track` — registra evento (impression/conversion)
- [ ] Winner declaration: quando significancia > 95%, sugere winner
- [ ] Apply winner: transforma variante vencedora em conteudo permanente
- [ ] UI no admin: `/admin/experimentos` — lista, criar, dashboard com resultados

---

### 3.4 Segmentos (Cache por Audiencia) `[INSPIRAR]` `M`

**O que faz:** Cada combinacao de flags ativas gera um "segmento" com hash unico. Cache e segmentado por audiencia.

**Fonte deco:**
- `deco/utils/segment.ts` — calcula hash do segmento a partir de cookies + flags + revision

**Implementacao:**
- [ ] Middleware Next.js: avalia matchers -> gera segment hash
- [ ] Segment hash = murmurhash3(sorted flag results + deployment revision)
- [ ] Inject `x-segment` header para Vercel Edge caching
- [ ] Vary: `x-segment` para separar cache por audiencia
- [ ] Cookie `brasa_segment` com TTL configuravel (sticky session)
- [ ] Fallback: se nenhum flag ativo, segment = "default" (cache universal)

---

## Sprint 4 — Developer Experience

### 4.1 Invoke API (Client-side) `[COPIAR]` `M`

**O que faz:** Frontend pode chamar loaders e actions do CMS diretamente do browser. Batch invoke. Type-safe.

**Fonte deco:**
- `deco/runtime/routes/invoke.ts` — endpoint invoke individual
- `deco/runtime/routes/batchInvoke.ts` — batch de multiplos invokes

**Implementacao:**
- [ ] Endpoint `POST /api/v1/invoke`
  ```json
  { "loader": "loadProducts", "props": { "limit": 10, "category": "vitaminas" } }
  ```
- [ ] Endpoint `POST /api/v1/invoke/batch`
  ```json
  [
    { "loader": "loadProducts", "props": { "limit": 5 } },
    { "loader": "loadPosts", "props": { "featured": true } }
  ]
  ```
- [ ] SDK client: `cms.invoke("loadProducts", { limit: 10 })` — type-safe
- [ ] Cache: respeitar mesmos TTLs dos loaders server-side
- [ ] Auth: API key obrigatoria, rate limiting

---

### 4.2 Widgets Avancados para Section Props `[COPIAR]` `M`

**O que faz:** Mais tipos de widget no editor de props: mapa, cor, code editor, secret, date picker, dynamic options.

**Fonte deco:**
- `apps/admin/widgets.ts` — definicao de todos os widgets
- `deco/engine/schema/comments.ts` — JSDoc annotations -> schema

**Implementacao:**
- [ ] Widget `color` — color picker com presets do tema
- [ ] Widget `code` — editor com syntax highlighting (Monaco ou CodeMirror)
- [ ] Widget `map` — picker de coordenadas (Leaflet/Mapbox embed)
- [ ] Widget `date` / `datetime` — date picker nativo
- [ ] Widget `secret` — input mascarado, valor encriptado no DB
- [ ] Widget `dynamic-options` — autocomplete que busca opcoes de uma API
- [ ] Widget `icon` — picker de icones (Lucide icons)
- [ ] Atualizar `defineSection()` para suportar `@format` annotations nos props
- [ ] Renderizacao dinamica no Page Builder baseada no tipo do widget

---

### 4.3 DOMInspector (Dev Mode) `[INSPIRAR]` `M`

**O que faz:** Em modo dev, Cmd+E ativa overlay que destaca sections na pagina. Click mostra info da section.

**Fonte deco:**
- `deco/components/LiveControls.tsx` — injeta metadata para o editor
- `inspect-vscode` repo — click-to-source integration

**Implementacao:**
- [ ] Script `inspector.js` injetado apenas em modo preview/dev
- [ ] Hover sobre section -> highlight overlay com nome da section
- [ ] Click -> abre painel lateral com props editaveis
- [ ] Botao "Edit in Admin" -> link direto para o Page Builder naquela section
- [ ] `data-section-id` e `data-section-type` attributes no HTML de cada section
- [ ] Atalho Cmd+E para toggle on/off

---

## Sprint 5 — Infraestrutura

### 5.1 Secrets Management `[COPIAR]` `S`

**O que faz:** API keys e secrets sao encriptados no banco. Decriptados apenas em runtime.

**Fonte deco:**
- `apps/website/loaders/secret.ts` — decrypt com DECO_CRYPTO_KEY

**Implementacao:**
- [ ] Encrypt com `crypto.createCipheriv` (AES-256-GCM) usando `BRASA_CRYPTO_KEY` env var
- [ ] Decrypt em runtime nas API routes que precisam do valor
- [ ] Widget `secret` no admin: mostra `********`, edita sem revelar valor atual
- [ ] Migrar secrets existentes (Supabase service role, API keys)

---

### 5.2 Observability (OpenTelemetry) `[INSPIRAR]` `L`

**O que faz:** Tracing distribuido, metricas e logs estruturados. Health probes.

**Fonte deco:**
- `deco/observability/` — OTEL setup, probes, HTTP instrumentation

**Implementacao:**
- [ ] Setup `@opentelemetry/sdk-node` no Next.js instrumentation hook
- [ ] Traces: cada request API com spans para DB, external calls, render
- [ ] Metricas: request count, latency p50/p95/p99, error rate, cache hit/miss
- [ ] Logs estruturados: JSON format com traceId, spanId, level
- [ ] Health endpoint: `GET /api/health` — memory, uptime, DB connectivity
- [ ] Export para Grafana Cloud, Datadog, ou HyperDX (configuravel)
- [ ] Dashboard no admin: `/admin/observability` — metricas em tempo real

---

### 5.3 Tiered Caching `[COPIAR]` `L`

**O que faz:** Cache em multiplas camadas: LRU in-memory -> Cache API -> Redis. Single flight dedup.

**Fonte deco:**
- `deco/runtime/caches/` — LRU, filesystem, Cache API, Redis, composicao

**Implementacao:**
- [ ] `CacheManager` class com interface unificada: `get(key)`, `set(key, value, ttl)`, `delete(key)`
- [ ] Tier 1: LRU in-memory (lru-cache, max 500 items)
- [ ] Tier 2: Redis/Upstash (opcional, para multi-instance)
- [ ] Single flight: dedup requests concorrentes para mesma key (Map de Promises)
- [ ] Stale-while-revalidate: serve stale, revalida em background
- [ ] Cache modes por loader: configuravel no `defineSection()`
- [ ] Cache invalidation: integrar com `revalidateTag` existente
- [ ] Metricas: hit/miss/stale counters

---

## Sprint 6 — Features Avancadas

### 6.1 Real-time Collaborative Editing `[INSPIRAR]` `XL`

**O que faz:** Multiplos editores no Page Builder simultaneamente. Mudancas sincronizadas via WebSocket.

**Fonte deco:**
- `deco/engine/decofile/realtime.ts` — WebSocket + JSON patches
- `deco/daemon/realtime/app.ts` — server-side realtime

**Implementacao:**
- [ ] WebSocket server (Supabase Realtime ou Liveblocks ou PartyKit)
- [ ] JSON patches (fast-json-patch) para diff incremental
- [ ] Presence: avatares de quem esta editando
- [ ] Conflict resolution: last-writer-wins por section
- [ ] Lock por section: enquanto alguem edita, outros veem "editing by X"

**Alternativa simples:** Pessimistic locking — apenas um editor por vez na mesma pagina.

---

### 6.2 Plugin/App System `[INSPIRAR]` `XL`

**O que faz:** Sistema de plugins que adicionam sections, loaders, actions ao CMS. Marketplace.

**Fonte deco:**
- `deco/blocks/app.ts` — App como modulo composavel
- `deco-cx/apps/` — 90+ apps com manifests

**Implementacao:**
- [ ] Interface `BrasaPlugin`:
  - `manifest` — sections, loaders, actions
  - `settings` — schema de configuracao
  - `middleware` — hooks no request pipeline
  - `routes` — rotas adicionais
- [ ] Registro de plugins: `plugins` table no DB
- [ ] Plugin loader: carrega manifest e merge com sections do tenant
- [ ] UI: `/admin/plugins` — instalar, configurar, desativar
- [ ] Plugins built-in iniciais: VTEX, Shopify, Analytics, SEO
- [ ] Sandboxing: plugins rodam isolados

---

### 6.3 Durable Workflows `[INSPIRAR]` `L`

**O que faz:** Jobs de longa duracao que sobrevivem a restarts.

**Fonte deco:**
- `deco/blocks/workflow.ts` — WorkflowContext com invoke de steps
- `apps/workflows/` — actions para start, cancel, signal

**Implementacao:**
- [ ] Usar Inngest (ja temos) como runtime de workflows
- [ ] Workflows built-in:
  - [ ] Sync Supabase (migrar de cron para workflow)
  - [ ] Bulk publish com validacao
  - [ ] Image optimization batch
  - [ ] Email sequences (newsletter)
- [ ] UI: `/admin/workflows` — status, logs, retry manual
- [ ] API: `POST /api/admin/workflows/[name]/start`

---

## Sprint 7 — Polish

### 7.1 JSON-LD Structured Data `[COPIAR]` `S`

**Fonte deco:** `apps/website/components/Seo.tsx` — array de JSON-LD objects

- [ ] Gerar JSON-LD automatico para: Article, Product, BreadcrumbList, Organization, WebSite, FAQPage
- [ ] Configuravel por tipo de conteudo no admin
- [ ] Validacao contra schema.org

---

### 7.2 SEO Commerce (PDP/PLP) `[COPIAR]` `S`

**Fonte deco:** `apps/website/sections/Seo/SeoPDP.tsx`, `SeoPLP.tsx`

- [ ] Structured data especifico para Product (price, availability, reviews)
- [ ] Structured data para ProductList (ItemList)
- [ ] Canonical URL automatico para variantes de produto

---

### 7.3 Theme: Google Fonts Loader `[COPIAR]` `S`

**Fonte deco:** `apps/website/components/Theme.tsx` — Google Fonts com weight/italic

- [ ] Picker de Google Fonts no admin (busca na API do Google Fonts)
- [ ] Gera `@font-face` otimizado com `font-display: swap`
- [ ] Suporte a multiplas familias e pesos
- [ ] Preview no admin antes de aplicar

---

### 7.4 Proxy Handler `[COPIAR]` `M`

**Fonte deco:** `apps/website/handlers/proxy.ts` — reverse proxy com text replacement

- [ ] Rota configuravel que faz proxy para URL externa
- [ ] Text replacement (util para integrar checkouts, landing pages externas)
- [ ] Script injection no HTML proxied
- [ ] Preservar headers e cookies relevantes
- [ ] UI no admin: `/admin/proxies` — configurar rotas proxy

---

## Resumo de Esforco

| Sprint | Features | Complexidade | Tempo estimado |
|--------|----------|-------------|----------------|
| 1 | SEO Previews, CSV Redirects, Lazy Sections | S + S + M | 1 semana |
| 2 | Image CDN | M | 1 semana |
| 3 | Matchers, Flags, A/B Tests, Segmentos | L + L + L + M | 3 semanas |
| 4 | Invoke API, Widgets, DOMInspector | M + M + M | 2 semanas |
| 5 | Secrets, OTEL, Tiered Cache | S + L + L | 2 semanas |
| 6 | Realtime Collab, Plugins, Workflows | XL + XL + L | 4+ semanas |
| 7 | JSON-LD, SEO Commerce, Fonts, Proxy | S + S + S + M | 1 semana |
| **Total** | **18 features** | | **~14 semanas** |

---

## Referencia Rapida — Arquivos do deco para copiar

| Feature | Arquivo fonte (deco-cx) | Adaptar para |
|---------|------------------------|--------------|
| Matchers | `apps/website/matchers/*.ts` | `src/lib/matchers/` |
| Flags | `deco/blocks/flag.ts` | `src/lib/flags/` |
| A/B multivariate | `apps/website/flags/multivariate/*.ts` | `src/lib/experiments/` |
| Segments | `deco/utils/segment.ts` | `src/middleware.ts` |
| Image component | `apps/website/components/Image.tsx` | SDK `@brasa/core` |
| Deferred section | `apps/website/sections/Rendering/Deferred.tsx` | SDK `@brasa/core` |
| SEO component | `apps/website/components/Seo.tsx` | `src/components/SeoPreview.tsx` |
| Theme/Fonts | `apps/website/components/Theme.tsx` | `src/app/(admin)/admin/tema/` |
| Redirects CSV | `apps/website/loaders/redirectsFromCsv.ts` | `src/app/api/admin/redirects/import/` |
| Invoke | `deco/runtime/routes/invoke.ts` | `src/app/api/v1/invoke/` |
| Secrets | `apps/website/loaders/secret.ts` | `src/lib/secrets.ts` |
| Cache tiers | `deco/runtime/caches/*.ts` | `src/lib/cache/` |
| Proxy | `apps/website/handlers/proxy.ts` | `src/app/api/v1/proxy/` |
| Widgets | `apps/admin/widgets.ts` | `src/components/admin/widgets/` |
| JSON-LD | `apps/website/components/Seo.tsx` (jsonLDs) | `src/lib/json-ld.ts` |
| Workflows | `deco/blocks/workflow.ts` | Inngest functions |

---

## Diferenciais Brasa que deco NAO tem (manter e evoluir)

- Billing SaaS (Stripe subscriptions + portal)
- Scheduled Publishing (scheduledAt + cron)
- Forms Builder (custom fields + submissions + email notify)
- Full-text Search (tsvector)
- Newsletter Management (subscribers + consent)
- Trash/Soft Delete (30-day grace period)
- AI Content Generation (credits + usage tracking)
- Robots.txt Editor
- RSS Feed
- Batch Operations (bulk CRUD + bulk publish)
- Analytics Dashboard (built-in, sem dependencia externa)
- Supabase Sync (webhook + cron, bidirecional)
- DB-backed multi-tenancy (mais robusto que git-per-site)
