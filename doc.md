# Brasa CMS — Briefing para Design do Frontend Admin

## O que é

CMS cloud multitenant para gerenciar blogs, catálogos de produtos e páginas de conteúdo. Cada cliente (tenant) acessa o mesmo painel admin, mas vê apenas seus dados. O CMS não tem frontend público — serve dados via API REST para frontends separados (modelo similar ao deco.cx / Sanity / Payload).

Referências visuais: **Payload CMS**, **Strapi**, **Sanity Studio**, **WordPress admin moderno**, **deco.cx admin**.

---

## Telas necessárias

### 1. Login (`/admin/login`)

**Estado atual:** Card branco centralizado, fundo cinza, logo no topo, campos email + senha, botão "Entrar".

**O que precisa:**
- Tela de login limpa e profissional
- Logo do CMS (Brasa CMS — não do cliente)
- Campos: email, senha
- Botão de submit com loading state (spinner)
- Mensagem de erro inline (credenciais inválidas)
- Fundo que transmita confiança/profissionalismo
- Sem link de "esqueci senha" por enquanto
- Sem cadastro — usuários são criados pelo admin

**Comportamento:**
- `/` redireciona para `/admin` que redireciona para `/admin/login` (se não autenticado)
- Auth via NextAuth (credentials provider)
- Após login, redireciona para `/admin` (dashboard)

---

### 2. Layout Admin (shell que envolve todas as telas)

**Estrutura:**
```
┌─────────────────────────────────────────────────┐
│ [Sidebar]  │  [Header: título + ações]          │
│            │                                     │
│  Blog      │  [Conteúdo da página]              │
│   Posts    │                                     │
│   Categ.  │                                     │
│   Autores │                                     │
│   Mídias  │                                     │
│            │                                     │
│  Catálogo  │                                     │
│   Produtos│                                     │
│   Categ.  │                                     │
│            │                                     │
│  Storefront│                                     │
│   Páginas │                                     │
│   Footer  │                                     │
│   Newsletter                                    │
│            │                                     │
│  Config    │                                     │
│   Settings│                                     │
│   Usuários│                                     │
│   Analytics                                     │
│            │                                     │
│  [?] Ajuda │                                     │
└─────────────────────────────────────────────────┘
```

**Sidebar:**
- Colapsável (ícone-only mode com 68px, expandida com 240px)
- Estado salvo no localStorage
- Mobile: drawer que abre por cima com overlay
- Grupos de navegação com ícones Lucide:
  - **Blog:** Posts, Categorias, Autores, Mídias
  - **Catálogo:** Produtos, Categorias de Produto
  - **Storefront:** Páginas (page builder), Footer, Newsletter
  - **Configurações:** Identidade, Contato, Redes Sociais, Robots, Analytics, Usuários
  - **Integrações:** Supabase
  - **Ajuda**
- Grupos são acordeões (expand/collapse com chevron)
- Busca rápida no topo (Command+K style, usa cmdk)
- Item ativo destacado visualmente

**Header:**
- Título da página atual (ex: "Posts", "Editar Post")
- Slot para ações extras (ex: botão "Novo Post", filtros)
- Hambúrguer no mobile pra abrir sidebar

**Toast notifications:** Sonner (bottom-right, rich colors, com botão de fechar)

---

### 3. Dashboard (`/admin`)

Primeira tela após login. Mostra overview do tenant:

- **Cards de métricas:** Total de posts, total de produtos, pageviews (últimos 7 dias), tempo médio de resposta
- **Gráfico de tráfego:** Últimos 7 dias (barras ou linha)
- **Últimas alterações:** Lista com ícone + título + "há X minutos"
- **Performance:** Latência p50/p95, taxa de erro, páginas mais lentas
- **Posts recentes:** Mini-lista dos últimos 5 posts publicados

---

### 4. Listagens (Posts, Produtos, Categorias, Autores, Mídias, Usuários)

Padrão consistente para todas as listagens:

**Header:** Título + botão "Novo [item]"

**Filtros:**
- Barra de busca (full-text search)
- Filtros por status (draft/published), categoria, data
- Posts e produtos: filtro por destaque (featured)

**Tabela:**
- Colunas: checkbox, imagem (thumbnail), título/nome, status badge, categoria, data, ações
- Sorting por coluna
- Seleção múltipla com checkbox
- Ações em massa (excluir, publicar, despublicar) — barra fixa no bottom quando items selecionados
- Paginação no footer da tabela

**Status badges:**
- Published → verde
- Draft → amarelo/cinza

**Ações por item:** Editar (link), excluir (confirmação)

**Mídias:** Grid de cards (não tabela) com thumbnail, nome, tamanho. Upload com drag-and-drop + crop.

---

### 5. Formulários de edição (Post, Produto, Categoria, Autor)

**Post:**
- Campos: título, slug (auto-gerado), excerpt, conteúdo (TipTap rich editor), categoria (select), autor (select), imagem de capa (upload), tags
- SEO accordion: meta title, meta description, focus keyword, OG title/description/image, noindex, nofollow, score
- Status: draft/published toggle
- Featured: checkbox
- Botões: Salvar rascunho, Publicar

**Produto:**
- Campos: nome, slug, descrição, conteúdo (TipTap), categoria de produto, imagem principal, galeria (multi-upload), composição, modo de uso, benefícios (array de {titulo, subtitulo}), diferenciais (array de strings)
- SEO: título, descrição
- Status, featured, show on site toggles
- Brand, isKit toggles

**Categoria/Autor:** Formulários mais simples — nome, slug, descrição, avatar/imagem

---

### 6. Page Builder (`/admin/paginas/[id]`)

Editor visual de páginas com sections drag-and-drop:

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Sidebar seções]  │  [Preview / Editor]          │
│                   │                               │
│  + Adicionar      │  ┌─────────────────────┐     │
│                   │  │  [Section: HeroPost] │     │
│  HeroPost    ≡    │  │  (props editáveis)   │     │
│  PostGrid    ≡    │  └─────────────────────┘     │
│  Banner      ≡    │  ┌─────────────────────┐     │
│  WhatsAppCTA ≡    │  │  [Section: PostGrid] │     │
│                   │  │  (props editáveis)   │     │
│                   │  └─────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Sidebar esquerda:**
- Lista de sections adicionadas à página (drag-and-drop para reordenar com @dnd-kit)
- Botão "+ Adicionar seção" abre modal com catálogo de sections disponíveis
- Cada item: nome da section, ícone de drag handle (≡), botão excluir

**Catálogo de sections (modal):**
- Sections agrupadas: Home, Marketing, Conteúdo
- Card para cada section: ícone, título, descrição curta
- Click adiciona ao final da lista

**Sections disponíveis no manifest:**
| Key | Título | Grupo | Props principais |
|-----|--------|-------|-----------------|
| Banner | Banner | Marketing | image, alt, title, description, backgroundColor, href, height |
| CategoryBar | Barra de Categorias | Home | title, showAll, limit |
| Features | Destaques | Conteúdo | title, subtitle, columns, items[] |
| Hero | Hero | Conteúdo | title, subtitle, backgroundImage, align, cta, dark |
| HeroPost | Post Destaque | Home | mode, manualSlug, showCategory, showAuthor, sideCount |
| PostCarousel | Lista de Posts | Home | title, mode, limit, showCategory, viewAllHref |
| PostGrid | Grade de Posts | Home | title, mode, limit, columns, showCategory, viewAllHref |
| PostGridWithSidebar | Grade + Lista Lateral | Home | gridTitle, gridMode, sidebarTitle, sidebarMode |
| ProductShowcase | Vitrine de Produtos | Home | title, mode, limit, columns, viewAllHref |
| WhatsAppCTA | CTA WhatsApp | Home | title, description, buttonText, defaultMessage, style |

**Editor de props (ao clicar numa section):**
- Formulário dinâmico baseado no manifest JSON
- Tipos de campo: text, textarea, rich-text, image (upload), color picker, select, number, boolean (toggle), array (items repetíveis), object (campos aninhados)
- Preview ao vivo (iframe do frontend com ?draft=true) — futuro

**Metadados da página:** Título, slug, SEO fields (accordion)

**Ações:** Salvar rascunho, Publicar (aplica draftSections → sections)

---

### 7. Configurações

Várias sub-telas, todas com layout de formulário:

- **Identidade:** Nome do site, descrição, logo (upload), favicon (upload)
- **Contato:** WhatsApp
- **Redes Sociais:** Facebook, Instagram, YouTube
- **Footer:** Texto do footer, copyright
- **Newsletter:** Título, descrição, texto de consentimento
- **Robots.txt:** Editor de texto simples
- **SEO:** Título global, descrição, keywords
- **Analytics:** GTM ID, GA4 ID, Google Ads ID, Facebook Pixel ID, Umami URL + Website ID, custom head/body scripts (textareas)
- **Usuários:** Listagem + CRUD de usuários com roles (admin, editor, author, viewer)
- **Supabase:** URL, chaves, toggle de sync, botão "Sincronizar agora"

---

## Stack frontend do admin

| Item | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Rich Editor | TipTap (ProseMirror) |
| Drag & Drop | @dnd-kit |
| Forms | react-hook-form + @hookform/resolvers + Zod |
| Notifications | Sonner |
| Command Palette | cmdk |
| Image Crop | react-image-crop |
| Charts | (a definir — pode ser Recharts ou Chart.js) |
| Auth | NextAuth v5 (credentials) |
| Font | Roboto (300, 400, 500, 700, 900) |

---

## Design tokens / Identidade visual

| Token | Valor atual | Nota |
|-------|-------------|------|
| Brand primary | `#0d61ac` | Azul — usado em CTAs, links, sidebar active |
| Brand hover | `#0a4f8c` | Variação mais escura |
| Background | `bg-gray-50` | Fundo geral do admin |
| Card | `bg-white` | Cards e painéis |
| Text primary | `text-gray-900` | |
| Text secondary | `text-gray-500` / `text-gray-400` | |
| Border | `border-gray-200` | |
| Error | `text-red-700` / `bg-red-50` | |
| Success | Verde (badges de status) | |
| Draft badge | Amarelo/cinza | |
| Font | Roboto, sans-serif | |
| Border radius | `rounded-md` (6px) para inputs, `rounded-lg` (8px) para cards | |

**Nota:** Esses tokens são do CMS em si — não do site do cliente. O CMS tem identidade própria (Brasa CMS). No futuro, pode ser white-label, mas por agora é branded.

---

## Comportamentos importantes

1. **Multitenant:** Cada usuário vê dados apenas do seu tenant. O tenant é resolvido pelo middleware via domínio/subdomain.

2. **Roles:**
   - `admin` — acesso total
   - `editor` — posts, produtos, páginas
   - `author` — apenas seus próprios posts
   - `viewer` — read-only

3. **Subscription check:** Middleware verifica status da assinatura antes de carregar admin. Se "suspended", redireciona pra tela de pagamento pendente.

4. **Responsividade:** Admin deve funcionar em desktop (sidebar fixa) e mobile (sidebar como drawer). Não precisa ser perfeito em mobile, mas usável.

5. **Loading states:** Skeleton loaders para listagens, spinner para submits, disabled buttons durante requests.

6. **Confirmações destrutivas:** Modal de confirmação antes de excluir qualquer item.

7. **Feedback:** Toast de sucesso/erro após toda ação (salvar, publicar, excluir).

---

## Fluxo de navegação

```
/ → redirect → /admin
/admin → (auth check) → /admin/login OU /admin (dashboard)
/admin/login → submit → /admin
/admin → dashboard com métricas
/admin/posts → listagem → /admin/posts/novo OU /admin/posts/[id]
/admin/paginas → listagem → /admin/paginas/[id] (page builder)
/admin/configuracoes → sub-menu de settings
```

---

## Contexto técnico

### Arquitetura CMS Cloud

```
store-front/ (este repo → cms.brasa.tech)
  src/
    app/
      (admin)/          ← Painel admin (todas as telas acima)
      api/admin/        ← 40+ endpoints CRUD protegidos por auth
      api/v1/           ← 15 endpoints REST públicos (consumidos pelos frontends)
      api/auth/         ← NextAuth
      api/webhooks/     ← Stripe, Supabase
      api/cron/         ← Jobs agendados
  packages/
    brasa-core/         ← Schema Drizzle, auth, validations, revalidate
    brasa-api/          ← Handlers dos endpoints admin
    brasa-admin/        ← Componentes React do admin (AdminShell, Sidebar, Drawers)
```

### Banco de dados (Neon PostgreSQL — 15 tabelas)

| Tabela | Uso |
|--------|-----|
| tenants | Multitenant (id, slug, name, domain, api_key, frontend_url) |
| users | Usuários do CMS (email, senha, role) |
| posts | Blog posts (título, conteúdo TipTap JSON, SEO, status) |
| products | Catálogo de produtos (nome, descrição, galeria, benefícios) |
| categories | Categorias de posts |
| product_categories | Categorias de produtos (hierárquicas) |
| authors | Autores de posts |
| media | Biblioteca de mídias (URL, alt, variantes de tamanho) |
| tags | Tags de posts |
| pages | Páginas do page builder (sections JSON + draftSections) |
| site_settings | Config do site (nome, logo, SEO, analytics, scripts) |
| subscribers | Newsletter |
| subscriptions | Assinatura Stripe |
| cms_guides | Ajuda/documentação |
| request_metrics | Analytics de tráfego |

### O que NÃO faz parte do admin

- Frontend público (blog, produtos, páginas) — projeto separado (brasa-starter)
- Renderização de sections — admin só armazena JSON `{ component, props }`
- Preview de páginas — será via iframe apontando pro frontend do cliente com `?draft=true`
