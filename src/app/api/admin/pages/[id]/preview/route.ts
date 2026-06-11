import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages, posts, categories, products, siteSettings, tenants } from "@brasa/core/schema";
import { and, eq, desc } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getRealPosts(tenantId: number, limit = 10) {
  return db.query.posts.findMany({
    where: eq(posts.tenantId, tenantId),
    orderBy: [desc(posts.publishedAt)],
    limit,
    with: { category: true, heroImage: true, author: true },
  });
}

async function getRealCategories(tenantId: number) {
  return db.select().from(categories).where(eq(categories.tenantId, tenantId));
}

async function getRealProducts(tenantId: number, limit = 50) {
  return db.query.products.findMany({
    where: eq(products.tenantId, tenantId),
    orderBy: [desc(products.createdAt)],
    limit,
    with: { image: true },
  });
}

// ── Campaign section renderers (type-based format) ───────────────────────────

function renderCampaignSection(s: Record<string, any>, index: number): string {
  const isEven = index % 2 === 0;
  const bgClass = isEven ? "lp-bg-white" : "lp-bg-alt";

  switch (s.type) {
    case "hero":
      return `<section class="lp-hero">
        <div class="lp-hero-inner">
          ${s.eyebrow ? `<span class="lp-eyebrow">${esc(s.eyebrow)}</span>` : ""}
          <h1 class="lp-hero-heading">${esc(s.heading || "")}</h1>
          <p class="lp-hero-desc">${esc(s.description || "")}</p>
        </div>
        <div class="lp-hero-gradient"></div>
      </section>`;

    case "trust_badges":
      return `<section class="lp-trust-badges">
        <div class="lp-trust-inner">
          ${(Array.isArray(s.items) ? s.items : []).map((item: any) => `
            <div class="lp-trust-item">
              ${item.icon ? `<img src="${esc(item.icon)}" alt="" class="lp-trust-icon" width="36" height="36" />` : `<div class="lp-trust-icon-placeholder"></div>`}
              <span class="lp-trust-text">${esc(item.text || "")}</span>
            </div>
          `).join("")}
        </div>
      </section>`;

    case "image_text":
      return `<section class="lp-content-block ${bgClass}">
        <div class="lp-content-inner lp-layout-img-left">
          <div class="lp-content-media">
            ${s.image?.src
              ? `<img src="${esc(s.image.src)}" alt="${esc(s.image?.alt || s.heading || "")}" class="lp-content-img" />`
              : `<div class="lp-img-placeholder"></div>`}
          </div>
          <div class="lp-content-text">
            <h2 class="lp-content-heading">${esc(s.heading || "")}</h2>
            <p class="lp-content-body">${esc(s.text || "")}</p>
          </div>
        </div>
      </section>`;

    case "text_image":
      return `<section class="lp-content-block ${bgClass}">
        <div class="lp-content-inner lp-layout-img-right">
          <div class="lp-content-text">
            <h2 class="lp-content-heading">${esc(s.heading || "")}</h2>
            <p class="lp-content-body">${esc(s.text || "")}</p>
          </div>
          <div class="lp-content-media">
            ${s.image?.src
              ? `<img src="${esc(s.image.src)}" alt="${esc(s.image?.alt || s.heading || "")}" class="lp-content-img" />`
              : `<div class="lp-img-placeholder"></div>`}
          </div>
        </div>
      </section>`;

    case "benefits_icons":
      return `<section class="lp-benefits">
        <div class="lp-benefits-inner">
          ${(Array.isArray(s.items) ? s.items : []).map((item: any) => `
            <div class="lp-benefit-card">
              ${item.icon ? `<img src="${esc(item.icon)}" alt="" class="lp-benefit-icon" width="56" height="56" />` : `<div class="lp-benefit-icon-placeholder"></div>`}
              <p class="lp-benefit-text">${esc(item.text || "")}</p>
            </div>
          `).join("")}
        </div>
      </section>`;

    case "product_shelf":
      return `<section class="lp-products">
        <div class="lp-products-inner">
          ${s.heading ? `<h2 class="lp-products-heading">${esc(s.heading)}</h2>` : ""}
          <div class="lp-products-grid">
            ${(Array.isArray(s.products) ? s.products : []).map((prod: any) => `
              <a href="${esc(prod.href || "#")}" class="lp-product-card" target="_blank" rel="noopener">
                ${prod.image ? `<img src="${esc(prod.image)}" alt="${esc(prod.name || "")}" class="lp-product-img" />` : `<div class="lp-product-img-placeholder"></div>`}
                <div class="lp-product-info">
                  <h3 class="lp-product-name">${esc(prod.name || "")}</h3>
                  ${prod.price ? `<span class="lp-product-price">${esc(prod.price)}</span>` : ""}
                  ${prod.installments ? `<span class="lp-product-installments">${esc(prod.installments)}</span>` : ""}
                  <span class="lp-product-cta">Comprar agora →</span>
                </div>
              </a>
            `).join("")}
          </div>
        </div>
      </section>`;

    case "video_section":
      return `<section class="lp-videos">
        <div class="lp-videos-inner">
          <div class="lp-videos-grid">
            ${(Array.isArray(s.videos) ? s.videos : []).map((v: any) => {
              const embedUrl = (v.url || "").replace("watch?v=", "embed/").replace("/shorts/", "/embed/");
              return `
                <div class="lp-video-card">
                  <div class="lp-video-wrapper">
                    <iframe src="${esc(embedUrl)}" frameborder="0" allowfullscreen loading="lazy"></iframe>
                  </div>
                  ${v.title ? `<p class="lp-video-title">${esc(v.title)}</p>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </section>`;

    default:
      return `<section class="section-unknown">
        <div class="unknown-header"><span class="section-badge">${index + 1}</span> ${esc(s.type || "desconhecido")}</div>
        <div class="unknown-props">${Object.entries(s).filter(([k]) => k !== "type").map(([k, v]) => `<span class="prop-pill"><b>${esc(k)}</b>: ${esc(typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80))}</span>`).join("")}</div>
      </section>`;
  }
}

// ── Section renderers with real data ──────────────────────────────────────────

function renderSection(
  s: { component?: string; type?: string; props?: Record<string, any>; [key: string]: any },
  index: number,
  data: { posts: any[]; categories: any[]; products: any[]; siteName: string },
): string {
  // Campaign sections use "type" field with flat props
  if (s.type && !s.component) {
    return renderCampaignSection(s, index);
  }

  const p = s.props || {};

  switch (s.component) {
    case "Banner":
      return `<section class="section-banner" style="background:${esc(p.backgroundColor || "#f3f4f6")}; min-height:${p.height === "grande" ? "320px" : p.height === "pequeno" ? "160px" : "240px"}">
        ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.alt || "")}" class="banner-img" />` : ""}
        <div class="banner-overlay">
          ${p.title ? `<h2 class="banner-title">${esc(p.title)}</h2>` : ""}
          ${p.description ? `<p class="banner-desc">${esc(p.description)}</p>` : ""}
          ${p.href ? `<a href="${esc(p.href)}" class="banner-link">Ver mais →</a>` : ""}
        </div>
      </section>`;

    case "Hero":
      return `<section class="section-hero${p.dark ? " hero-dark" : ""}" style="${p.backgroundImage ? `background-image:url(${esc(p.backgroundImage)})` : ""}">
        <div class="hero-content" style="text-align:${p.align === "direita" ? "right" : p.align === "centro" ? "center" : "left"}">
          <h1 class="hero-title">${esc(p.title || "")}</h1>
          ${p.subtitle ? `<p class="hero-subtitle">${esc(p.subtitle)}</p>` : ""}
          ${p.content ? `<div class="hero-text">${p.content}</div>` : ""}
          ${p.cta ? `<a href="${esc(p.cta.href || "#")}" class="hero-cta">${esc(p.cta.label || "CTA")}</a>` : ""}
        </div>
      </section>`;

    case "HeroPost": {
      const featured = data.posts[0];
      const sidePosts = data.posts.slice(1, 1 + parseInt(p.sideCount || "4"));
      return `<section class="section-heropost">
        <div class="heropost-main">
          ${featured?.heroImage?.url ? `<img src="${esc(featured.heroImage.url)}" alt="${esc(featured.title)}" class="heropost-img" />` : `<div class="placeholder-img"></div>`}
          <div class="heropost-info">
            ${p.showCategory !== false && featured?.category ? `<span class="tag">${esc(featured.category.name)}</span>` : ""}
            <h2>${esc(featured?.title || "Sem posts ainda")}</h2>
            <p class="meta">${p.showAuthor !== false && featured?.author ? `${esc(featured.author.name)} • ` : ""}${p.showReadingTime !== false ? `${featured?.readingTimeMinutes || 5} min leitura` : ""}</p>
          </div>
        </div>
        <aside class="heropost-side">
          ${sidePosts.map((post: any, i: number) => `
            <div class="side-post"><span class="side-num">${i + 1}</span><span>${esc(post.title)}</span></div>
          `).join("")}
          ${sidePosts.length === 0 ? `<div class="side-post"><span class="side-num">—</span><span class="meta">Publique posts para ver aqui</span></div>` : ""}
        </aside>
      </section>`;
    }

    case "PostCarousel":
    case "PostGrid": {
      const limit = parseInt(p.limit || "6");
      const postsSlice = data.posts.slice(0, limit);
      const cols = p.columns || "3";
      return `<section class="section-posts">
        <div class="section-header-row">
          <div><h2>${esc(p.title || "Posts")}</h2>${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ""}</div>
          ${p.viewAllHref ? `<a href="${esc(p.viewAllHref)}" class="view-all">Ver todos →</a>` : ""}
        </div>
        <div class="post-grid cols-${cols}">
          ${postsSlice.map((post: any) => `
            <div class="post-card">
              ${post.heroImage?.url ? `<img src="${esc(post.heroImage.url)}" alt="${esc(post.title)}" class="post-card-img" />` : `<div class="placeholder-img small"></div>`}
              <div class="post-card-body">
                ${p.showCategory !== false && post.category ? `<span class="tag small">${esc(post.category.name)}</span>` : ""}
                <h3>${esc(post.title)}</h3>
                ${p.showReadingTime !== false ? `<span class="meta">${post.readingTimeMinutes || 5} min</span>` : ""}
              </div>
            </div>
          `).join("")}
          ${postsSlice.length === 0 ? `<p class="meta">Nenhum post publicado ainda.</p>` : ""}
        </div>
      </section>`;
    }

    case "PostGridWithSidebar": {
      const gridPosts = data.posts.slice(0, parseInt(p.gridLimit || "4"));
      const sidebarPosts = data.posts.slice(0, parseInt(p.sidebarLimit || "5"));
      return `<section class="section-grid-sidebar">
        <div class="grid-main">
          <h2>${esc(p.gridTitle || "Posts")}</h2>
          <div class="post-grid cols-${p.gridColumns || "2"}">
            ${gridPosts.map((post: any) => `
              <div class="post-card">
                ${post.heroImage?.url ? `<img src="${esc(post.heroImage.url)}" alt="${esc(post.title)}" class="post-card-img" />` : `<div class="placeholder-img small"></div>`}
                <div class="post-card-body">
                  ${p.gridShowCategory !== false && post.category ? `<span class="tag small">${esc(post.category.name)}</span>` : ""}
                  <h3>${esc(post.title)}</h3>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <aside class="grid-sidebar">
          <h3>${esc(p.sidebarTitle || "Destaques")}</h3>
          ${sidebarPosts.map((post: any, i: number) => `
            <div class="side-post"><span class="side-num">${i + 1}</span><span>${esc(post.title)}</span></div>
          `).join("")}
        </aside>
      </section>`;
    }

    case "CategoryBar": {
      const cats = data.categories.slice(0, parseInt(p.limit || "10"));
      return `<section class="section-catbar">
        ${p.title ? `<h3>${esc(p.title)}</h3>` : ""}
        <div class="catbar-list">
          ${cats.map((cat: any) => `<span class="cat-pill">${esc(cat.name)}</span>`).join("")}
          ${cats.length === 0 ? `<span class="meta">Nenhuma categoria</span>` : ""}
        </div>
      </section>`;
    }

    case "LpHero": {
      const heroProd = p.productSlug ? data.products.find((pr: any) => pr.slug === p.productSlug) : null;
      return `<section class="section-lphero"${p.backgroundImage ? ` style="background-image:url(${esc(p.backgroundImage)});background-size:cover;background-position:center"` : ""}>
        <div class="lphero-content">
          <h1 class="lphero-headline">${esc(p.headline || heroProd?.name || "")}</h1>
          ${p.subheadline ? `<p class="lphero-sub">${esc(p.subheadline || heroProd?.description || "")}</p>` : ""}
          ${p.ctaText ? `<a href="${esc(p.ctaUrl || "#")}" class="hero-cta">${esc(p.ctaText)}</a>` : ""}
        </div>
        ${p.showProductImage !== false && heroProd?.image?.url ? `<div class="lphero-img"><img src="${esc(heroProd.image.url)}" alt="${esc(heroProd.name)}" /></div>` : ""}
      </section>`;
    }

    case "LpBenefits": {
      const iconMap: Record<string, string> = { leaf: "🌿", shield: "🛡️", heart: "❤️", zap: "⚡", star: "⭐", check: "✅" };
      return `<section class="section-lpbenefits">
        ${p.title ? `<h2>${esc(p.title)}</h2>` : ""}
        ${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ""}
        <div class="benefits-grid cols-${p.columns || "3"} variant-${p.variant || "cards"}">
          ${(Array.isArray(p.items) ? p.items : []).map((item: any) => `
            <div class="benefit-card">
              <div class="benefit-icon">${iconMap[item.icon] || "✦"}</div>
              <h4>${esc(item.title || "")}</h4>
              <p>${esc(item.description || "")}</p>
            </div>
          `).join("")}
        </div>
      </section>`;
    }

    case "LpFeatureDetail":
      return `<section class="section-feature-detail ${p.layout === "image-right" ? "layout-right" : "layout-left"}">
        ${p.image ? `<div class="fd-image"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || "")}" /></div>` : ""}
        <div class="fd-content">
          ${p.showBadge && p.badgeText ? `<span class="fd-badge">${esc(p.badgeText)}</span>` : ""}
          <h2>${esc(p.title || "")}</h2>
          ${p.description ? `<div class="fd-text">${p.description}</div>` : ""}
        </div>
      </section>`;

    case "ImageText":
      return `<section class="section-imagetext ${p.imagePosition === "direita" ? "img-right" : "img-left"}">
        ${p.image ? `<div class="it-image"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || "")}" /></div>` : ""}
        <div class="it-content">
          <h2>${esc(p.title || "")}</h2>
          <div class="it-text">${p.text || ""}</div>
        </div>
      </section>`;

    case "VideoEmbed":
      return `<section class="section-video">
        ${p.title ? `<h2>${esc(p.title)}</h2>` : ""}
        ${p.description ? `<p class="subtitle">${esc(p.description)}</p>` : ""}
        <div class="video-wrapper ratio-${(p.aspectRatio || "16:9").replace(":", "-")}">
          <iframe src="${esc((p.videoUrl || "").replace("watch?v=", "embed/").replace("/shorts/", "/embed/"))}" frameborder="0" allowfullscreen></iframe>
        </div>
      </section>`;

    case "LpCTA":
      return `<section class="section-lpcta variant-${p.variant || "default"}">
        <h2>${esc(p.title || "Pronto para experimentar?")}</h2>
        ${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ""}
        <a href="${esc(p.ctaUrl || "#")}" class="lpcta-btn">${p.showWhatsAppIcon !== false ? "💬 " : ""}${esc(p.ctaText || "Falar pelo WhatsApp")}</a>
      </section>`;

    case "Features":
      return `<section class="section-features">
        <h2>${esc(p.title || "")}</h2>
        ${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ""}
        <div class="features-grid cols-${p.columns || "3"}">
          ${(Array.isArray(p.items) ? p.items : []).map((item: any) => `
            <div class="feature-card">
              ${item.icon ? `<img src="${esc(item.icon)}" class="feature-icon" alt="" />` : `<div class="feature-icon-placeholder"></div>`}
              <h4>${esc(item.title || "")}</h4>
              <p>${esc(item.description || "")}</p>
            </div>
          `).join("")}
        </div>
      </section>`;

    case "ProductShowcase": {
      const prodLimit = parseInt(p.limit || "4");
      let prods = data.products;
      if (p.mode === "manual" && p.manualSlugs) {
        const slugs = (p.manualSlugs as string).split(",").map((s: string) => s.trim());
        prods = slugs.map((sl: string) => data.products.find((pr: any) => pr.slug === sl)).filter(Boolean);
      }
      prods = prods.slice(0, prodLimit);
      return `<section class="section-products">
        <h2>${esc(p.title || "Produtos")}</h2>
        <div class="product-grid cols-${p.columns || "4"}">
          ${prods.map((prod: any) => `
            <div class="product-card">
              ${prod.image?.url ? `<img src="${esc(prod.image.url)}" alt="${esc(prod.name)}" class="product-card-img" />` : `<div class="placeholder-img small"></div>`}
              <h4>${esc(prod.name)}</h4>
              ${p.showDescription && prod.description ? `<p class="meta">${esc(prod.description.slice(0, 80))}</p>` : ""}
            </div>
          `).join("")}
          ${prods.length === 0 ? `<p class="meta">Nenhum produto cadastrado.</p>` : ""}
        </div>
        ${p.viewAllHref ? `<a href="${esc(p.viewAllHref)}" class="view-all center">Ver todos →</a>` : ""}
      </section>`;
    }

    case "WhatsAppCTA":
      return `<section class="section-wpp" style="background:${p.style === "dark" ? "#1a1a1a" : p.style === "brand" ? "#075e54" : "#f0fdf4"}; color:${p.style === "light" ? "#1a1a1a" : "#fff"}">
        <h2>${esc(p.title || "Fale conosco")}</h2>
        <p>${esc(p.description || "")}</p>
        <button class="wpp-btn">${esc(p.buttonText || "Iniciar conversa")}</button>
      </section>`;

    case "Header":
      return `<header class="preview-header">
        <div class="preview-header-inner">
          <div class="preview-header-logo">${esc(data.siteName)}</div>
          <nav class="preview-header-nav">
            ${p.showCategories !== false ? data.categories.slice(0, 7).map((c: any) => `<a href="#" class="preview-header-link">${esc(c.name)}</a>`).join("") : ""}
          </nav>
          <div class="preview-header-actions">
            ${p.showSearch !== false ? `<span class="preview-header-search">Buscar</span>` : ""}
          </div>
        </div>
      </header>`;

    case "Footer":
      return `<footer class="preview-footer">
        <div class="preview-footer-inner">
          ${p.showNewsletter !== false ? `<div class="preview-footer-newsletter"><h4>Receba novidades</h4><div class="preview-footer-form"><input type="email" placeholder="seu@email.com" disabled /><button disabled>Assinar</button></div></div>` : ""}
          <div class="preview-footer-bottom">
            <p>© ${new Date().getFullYear()} ${esc(data.siteName)} — Todos os direitos reservados</p>
            ${p.showPrivacy !== false ? `<a href="#">Politica de Privacidade</a>` : ""}
          </div>
        </div>
      </footer>`;

    default:
      return `<section class="section-unknown">
        <div class="unknown-header"><span class="section-badge">${index + 1}</span> ${esc(s.component ?? "Section")}</div>
        <div class="unknown-props">${Object.entries(p).map(([k, v]) => `<span class="prop-pill"><b>${esc(k)}</b>: ${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`).join("")}</div>
      </section>`;
  }
}

// ── CSS styles ────────────────────────────────────────────────────────────────

const PREVIEW_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; }
h1, h2, h3, h4 { font-family: 'Playfair Display', serif; }
img { max-width: 100%; height: auto; display: block; }
.preview-bar { position: sticky; top: 0; z-index: 100; background: #f59e0b; color: #000; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
.section-banner { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.banner-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.banner-overlay { position: relative; z-index: 1; text-align: center; padding: 40px 24px; }
.banner-title { font-size: 1.5rem; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.5); }
.banner-desc { margin-top: 8px; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.4); }
.banner-link { display: inline-block; margin-top: 12px; color: #fff; font-weight: 600; text-decoration: underline; }
.section-hero { min-height: 400px; display: flex; align-items: center; background-size: cover; background-position: center; padding: 60px 24px; }
.hero-dark { background-color: #111; color: #fff; }
.hero-content { max-width: 700px; margin: 0 auto; }
.hero-title { font-size: 2.5rem; margin-bottom: 12px; }
.hero-subtitle { font-size: 1.1rem; opacity: 0.85; margin-bottom: 16px; }
.hero-cta { display: inline-block; margin-top: 16px; padding: 12px 28px; background: #1a1a1a; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
.hero-dark .hero-cta { background: #fff; color: #1a1a1a; }
.section-heropost { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 24px; max-width: 1200px; margin: 0 auto; }
.heropost-main { position: relative; border-radius: 12px; overflow: hidden; min-height: 300px; }
.heropost-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
.heropost-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(transparent, rgba(0,0,0,.7)); color: #fff; }
.heropost-info h2 { font-size: 1.5rem; }
.heropost-side { display: flex; flex-direction: column; gap: 8px; }
.side-post { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: #f9fafb; font-size: 13px; }
.side-num { font-weight: 700; color: #9ca3af; font-size: 18px; min-width: 24px; }
.section-posts { padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
.section-header-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
.section-header-row h2 { font-size: 1.4rem; }
.subtitle { font-size: 0.9rem; color: #6b7280; margin-top: 4px; }
.view-all { font-size: 13px; font-weight: 600; color: #0d61ac; text-decoration: none; }
.view-all.center { display: block; text-align: center; margin-top: 20px; }
.post-grid { display: grid; gap: 16px; }
.post-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.post-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.post-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.post-card { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
.post-card-img { width: 100%; height: 160px; object-fit: cover; }
.post-card-body { padding: 12px; }
.post-card-body h3 { font-size: 14px; margin-top: 4px; }
.section-grid-sidebar { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
.grid-main h2, .grid-sidebar h3 { margin-bottom: 16px; }
.grid-sidebar { display: flex; flex-direction: column; gap: 8px; }
.section-catbar { padding: 20px 24px; max-width: 1200px; margin: 0 auto; }
.section-catbar h3 { font-size: 1rem; margin-bottom: 12px; }
.catbar-list { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-pill { padding: 6px 14px; border-radius: 20px; background: #f3f4f6; font-size: 13px; font-weight: 500; }
.section-features { padding: 48px 24px; max-width: 1200px; margin: 0 auto; text-align: center; }
.section-features h2 { font-size: 1.5rem; margin-bottom: 8px; }
.features-grid { display: grid; gap: 24px; margin-top: 32px; text-align: left; }
.features-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.features-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.features-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.feature-card { padding: 24px; border-radius: 12px; background: #f9fafb; }
.feature-card h4 { margin: 12px 0 6px; }
.feature-card p { font-size: 13px; color: #6b7280; }
.feature-icon { width: 40px; height: 40px; object-fit: contain; }
.feature-icon-placeholder { width: 40px; height: 40px; border-radius: 8px; background: #e5e7eb; }
.section-products { padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
.section-products h2 { font-size: 1.4rem; margin-bottom: 20px; }
.product-grid { display: grid; gap: 16px; }
.product-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.product-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.product-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.product-card { border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; }
.product-card-img { width: 100%; height: 160px; object-fit: cover; }
.product-card h4 { padding: 8px 12px 0; font-size: 14px; font-family: 'Inter', sans-serif; }
.product-card .meta { padding: 0 12px 8px; font-size: 12px; color: #6b7280; }
.section-wpp { padding: 48px 24px; text-align: center; border-radius: 12px; margin: 24px; }
.section-wpp h2 { font-size: 1.4rem; margin-bottom: 8px; }
.section-wpp p { margin-bottom: 16px; opacity: 0.9; }
.wpp-btn { padding: 12px 28px; border: none; border-radius: 24px; background: #25d366; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
/* Header */
.preview-header { background: #fff; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 50; }
.preview-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; gap: 24px; }
.preview-header-logo { font-size: 18px; font-weight: 700; color: #0d61ac; font-family: 'Inter', sans-serif; }
.preview-header-nav { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; justify-content: center; }
.preview-header-link { padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; color: #374151; text-decoration: none; transition: background 0.15s; }
.preview-header-link:hover { background: #f3f4f6; }
.preview-header-actions { display: flex; align-items: center; gap: 12px; }
.preview-header-search { font-size: 12px; color: #9ca3af; padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 6px; }

/* Footer */
.preview-footer { background: #111827; color: #d1d5db; padding: 48px 24px 24px; margin-top: 0; }
.preview-footer-inner { max-width: 1200px; margin: 0 auto; }
.preview-footer-newsletter { text-align: center; margin-bottom: 32px; }
.preview-footer-newsletter h4 { color: #fff; margin-bottom: 12px; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; }
.preview-footer-form { display: flex; gap: 8px; justify-content: center; max-width: 400px; margin: 0 auto; }
.preview-footer-form input { flex: 1; padding: 8px 14px; border: 1px solid #374151; border-radius: 6px; background: #1f2937; color: #d1d5db; font-size: 13px; }
.preview-footer-form button { padding: 8px 16px; background: #0d61ac; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; }
.preview-footer-bottom { text-align: center; padding-top: 24px; border-top: 1px solid #1f2937; }
.preview-footer-bottom p { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.preview-footer-bottom a { font-size: 12px; color: #6b7280; text-decoration: none; }
.preview-footer-bottom a:hover { color: #9ca3af; }

/* Legacy footer (keep for compat) */
.section-footer { background: #f9fafb; padding: 40px 24px; text-align: center; border-top: 1px solid #e5e7eb; margin-top: 24px; }
.footer-newsletter { margin-bottom: 20px; }
.footer-newsletter h4 { margin-bottom: 10px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; }
.newsletter-form { display: flex; gap: 8px; justify-content: center; }
.newsletter-form input { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 220px; }
.newsletter-form button { padding: 8px 16px; background: #1a1a1a; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.footer-social { display: flex; gap: 12px; justify-content: center; margin-bottom: 16px; }
.social-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #e5e7eb; font-size: 11px; font-weight: 700; }
.footer-copy { font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
.footer-link { font-size: 12px; color: #6b7280; }
section + section { margin-top: 8px; }
section[class^="lp-"] + section[class^="lp-"],
section.lp-content-block + section.lp-content-block { margin-top: 0; }
.section-lphero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 64px 40px; max-width: 1200px; margin: 0 auto; min-height: 420px; }
.lphero-headline { font-size: 2.4rem; margin-bottom: 16px; line-height: 1.2; }
.lphero-sub { font-size: 1rem; color: #4b5563; margin-bottom: 24px; line-height: 1.7; }
.lphero-img { display: flex; align-items: center; justify-content: center; }
.lphero-img img { width: 100%; max-height: 360px; object-fit: contain; }
.section-lpbenefits { padding: 56px 40px; max-width: 1200px; margin: 0 auto; text-align: center; background: #fafafa; border-radius: 16px; }
.section-lpbenefits h2 { font-size: 1.5rem; margin-bottom: 8px; }
.benefits-grid { display: grid; gap: 20px; margin-top: 32px; text-align: center; }
.benefits-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.benefits-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.benefits-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
.benefit-card { padding: 28px 20px; border-radius: 12px; background: #fff; border: 1px solid #e5e7eb; }
.benefit-card h4 { margin: 10px 0 6px; font-size: 15px; }
.benefit-card p { font-size: 13px; color: #6b7280; line-height: 1.5; }
.benefit-icon { font-size: 32px; }
.variant-minimal .benefit-card { background: transparent; border: none; }
.section-feature-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 48px 40px; max-width: 1200px; margin: 0 auto; }
.section-feature-detail.layout-left { direction: rtl; }
.section-feature-detail.layout-left > * { direction: ltr; }
.fd-image img { width: 100%; border-radius: 12px; object-fit: cover; max-height: 340px; }
.fd-content h2 { font-size: 1.4rem; margin-bottom: 12px; }
.fd-text { font-size: 0.93rem; color: #374151; line-height: 1.7; }
.fd-text p { margin-bottom: 10px; }
.fd-badge { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
.section-imagetext { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; padding: 48px 40px; max-width: 1200px; margin: 0 auto; }
.section-imagetext.img-right { direction: rtl; }
.section-imagetext.img-right > * { direction: ltr; }
.it-image img { width: 100%; border-radius: 12px; object-fit: cover; max-height: 340px; }
.it-content h2 { font-size: 1.4rem; margin-bottom: 12px; }
.it-text { font-size: 0.93rem; color: #374151; line-height: 1.7; }
.it-text p { margin-bottom: 10px; }
.section-video { padding: 40px 40px; max-width: 900px; margin: 0 auto; text-align: center; }
.section-video h2 { font-size: 1.3rem; margin-bottom: 8px; }
.video-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; margin-top: 16px; border-radius: 12px; overflow: hidden; background: #000; }
.video-wrapper.ratio-4-3 { padding-bottom: 75%; }
.video-wrapper.ratio-1-1 { padding-bottom: 100%; }
.video-wrapper iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
.section-lpcta { padding: 56px 40px; text-align: center; background: #f0f9ff; border-radius: 16px; margin: 24px 40px; }
.section-lpcta.variant-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.section-lpcta.variant-dark { background: #1a1a1a; color: #fff; }
.section-lpcta h2 { font-size: 1.4rem; margin-bottom: 8px; }
.section-lpcta p { margin-bottom: 16px; opacity: 0.9; }
.lpcta-btn { display: inline-block; padding: 14px 32px; background: #25d366; color: #fff; border-radius: 28px; font-weight: 600; text-decoration: none; font-size: 15px; }
.section-lpcta.variant-dark .lpcta-btn { background: #fff; color: #1a1a1a; }
.section-unknown { margin: 16px 24px; padding: 16px; border: 1px dashed #d1d5db; border-radius: 8px; }
.unknown-header { font-weight: 600; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.unknown-props { display: flex; flex-wrap: wrap; gap: 6px; }
.prop-pill { font-size: 11px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.tag.small { font-size: 10px; padding: 1px 6px; }
.meta { font-size: 12px; color: #9ca3af; }
.placeholder-img { width: 100%; height: 280px; background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%); border-radius: 8px; }
.placeholder-img.small { height: 160px; border-radius: 0; }
.section-badge { background: #0d61ac; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
@media (max-width: 768px) {
  .section-heropost { grid-template-columns: 1fr; }
  .section-grid-sidebar { grid-template-columns: 1fr; }
  .post-grid.cols-3, .post-grid.cols-4 { grid-template-columns: repeat(2, 1fr); }
  .product-grid.cols-3, .product-grid.cols-4 { grid-template-columns: repeat(2, 1fr); }
  .lp-content-inner { grid-template-columns: 1fr !important; }
  .lp-trust-inner { flex-direction: column; align-items: center; }
  .lp-benefits-inner { grid-template-columns: 1fr !important; }
  .lp-products-grid { grid-template-columns: 1fr !important; }
  .lp-videos-grid { grid-template-columns: 1fr !important; }
  .lp-hero-heading { font-size: 2rem !important; }
}

/* ── Campaign LP Styles ──────────────────────────────────────────────────── */

/* Hero */
.lp-hero {
  position: relative;
  background: linear-gradient(135deg, #0d3b66 0%, #1a5276 40%, #1e6f9f 100%);
  color: #fff;
  padding: 80px 24px 72px;
  text-align: center;
  overflow: hidden;
}
.lp-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 80%, rgba(255,255,255,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.04) 0%, transparent 50%);
  pointer-events: none;
}
.lp-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 0 auto;
}
.lp-hero-gradient {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, #fff);
}
.lp-eyebrow {
  display: inline-block;
  padding: 6px 18px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 24px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 20px;
  color: rgba(255,255,255,0.9);
}
.lp-hero-heading {
  font-size: 2.8rem;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 18px;
  letter-spacing: -0.02em;
}
.lp-hero-desc {
  font-size: 1.1rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.85);
  max-width: 620px;
  margin: 0 auto;
}

/* Trust Badges */
.lp-trust-badges {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 28px 24px;
}
.lp-trust-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}
.lp-trust-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lp-trust-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(23%) sepia(76%) saturate(500%) hue-rotate(180deg);
}
.lp-trust-icon-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #cbd5e1;
}
.lp-trust-text {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  letter-spacing: 0.01em;
}

/* Content blocks (image_text / text_image) */
.lp-content-block {
  padding: 0;
}
.lp-bg-white { background: #fff; }
.lp-bg-alt { background: #f8fafc; }
.lp-content-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
  align-items: stretch;
  min-height: 400px;
}
.lp-content-media {
  position: relative;
  overflow: hidden;
}
.lp-content-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  min-height: 360px;
}
.lp-img-placeholder {
  width: 100%;
  height: 100%;
  min-height: 360px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
}
.lp-content-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px;
}
.lp-content-heading {
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
  line-height: 1.3;
}
.lp-content-body {
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.8;
}

/* Benefits Icons */
.lp-benefits {
  background: linear-gradient(135deg, #0d3b66 0%, #1a5276 100%);
  padding: 56px 24px;
}
.lp-benefits-inner {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.lp-benefit-card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  backdrop-filter: blur(8px);
}
.lp-benefit-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  margin: 0 auto 16px;
  filter: brightness(0) invert(1);
}
.lp-benefit-icon-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255,255,255,0.15);
  margin: 0 auto 16px;
}
.lp-benefit-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.92);
  line-height: 1.5;
}

/* Product Shelf */
.lp-products {
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  padding: 64px 24px;
}
.lp-products-inner {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}
.lp-products-heading {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 32px;
}
.lp-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  justify-items: center;
}
.lp-product-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  max-width: 320px;
  width: 100%;
}
.lp-product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1);
}
.lp-product-img {
  width: 100%;
  height: 220px;
  object-fit: contain;
  padding: 16px;
  background: #f8fafc;
}
.lp-product-img-placeholder {
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}
.lp-product-info {
  padding: 20px;
  text-align: left;
}
.lp-product-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
}
.lp-product-price {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: #0d3b66;
  margin-bottom: 4px;
  font-family: 'Inter', sans-serif;
}
.lp-product-installments {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}
.lp-product-cta {
  display: inline-block;
  padding: 10px 24px;
  background: #0d3b66;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Video Section */
.lp-videos {
  background: #f8fafc;
  padding: 56px 24px;
}
.lp-videos-inner {
  max-width: 900px;
  margin: 0 auto;
}
.lp-videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.lp-video-card {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.lp-video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 177.78%; /* 9:16 for shorts */
  background: #000;
}
.lp-video-wrapper iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.lp-video-title {
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  text-align: center;
}
`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  const tenantId = await getTenantId();
  if (isNaN(numId))
    return new NextResponse("ID invalido", { status: 400 });

  const [page] = await db.select().from(pages).where(and(eq(pages.id, numId), eq(pages.tenantId, tenantId))).limit(1);
  if (!page)
    return new NextResponse("Pagina nao encontrada", { status: 404 });

  const useSections = request.nextUrl.searchParams.get("sections") === "draft";
  const mode = request.nextUrl.searchParams.get("mode");

  // ── Frontend preview (only when explicitly requested via ?mode=frontend) ──
  if (mode === "frontend") {
    const [tenant] = await db
      .select({ frontendUrl: tenants.frontendUrl, previewUrl: tenants.previewUrl, revalidateSecret: tenants.revalidateSecret })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const frontendBase = tenant?.previewUrl || tenant?.frontendUrl;

    if (frontendBase) {
      // Quick HEAD check with 3s timeout to verify frontend availability
      let frontendAvailable = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${frontendBase}/api/cms-preview`, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        frontendAvailable = res.ok || res.status === 405 || res.status === 400;
      } catch {
        // Frontend not reachable — fall through to internal renderer
      }

      if (frontendAvailable) {
        const pagePath = page.slug === "home" ? "/" : `/${page.slug}`;
        const previewUrl = `${frontendBase}/api/cms-preview?secret=${encodeURIComponent(tenant?.revalidateSecret || "")}&path=${encodeURIComponent(pagePath)}`;
        return NextResponse.redirect(previewUrl);
      }
    }

    // Frontend not available — fall through to internal renderer
  }

  // ── Internal renderer (default, handles both CMS and campaign section formats) ──
  if (useSections) {
    const sections = (page.draftSections ?? page.sections) as { component?: string; type?: string; props?: Record<string, any>; [key: string]: any }[] | null;
    if (sections && sections.length > 0) {
      // Fetch real data in parallel
      const [realPosts, realCategories, realProducts, settings] = await Promise.all([
        getRealPosts(tenantId),
        getRealCategories(tenantId),
        getRealProducts(tenantId),
        db.select({ siteName: siteSettings.siteName }).from(siteSettings).where(eq(siteSettings.tenantId, tenantId)).limit(1),
      ]);

      const data = {
        posts: realPosts,
        categories: realCategories,
        products: realProducts,
        siteName: settings[0]?.siteName || "Meu Site",
      };

      const renderedSections = sections.map((s, i) => renderSection(s, i, data)).join("\n");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview: ${esc(page.title ?? "")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <style>${PREVIEW_CSS}</style>
</head>
<body>
  ${renderedSections}
</body>
</html>`;

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  }

  // Fallback: content-based preview
  const draft = page.draft as Record<string, unknown> | null;
  const title = (draft?.title as string) ?? page.title ?? "";
  const content = (draft?.content as string) ?? page.content ?? "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; line-height: 1.7; }
    h1, h2, h3 { font-family: 'Playfair Display', serif; }
    .preview-bar { position: sticky; top: 0; z-index: 100; background: #f59e0b; color: #000; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
    .content { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    .content h1 { font-size: 1.75rem; margin-bottom: 16px; }
    .content p { margin-bottom: 12px; color: #444; }
    .content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="preview-bar">Preview — Rascunho</div>
  <main class="content">${content}</main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
