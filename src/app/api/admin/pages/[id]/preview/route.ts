import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderSection(s: { component: string; props: Record<string, any> }, index: number): string {
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

    case "HeroPost":
      return `<section class="section-heropost">
        <div class="heropost-main">
          <div class="placeholder-img"></div>
          <div class="heropost-info">
            ${p.showCategory !== false ? `<span class="tag">Categoria</span>` : ""}
            <h2>Post em Destaque</h2>
            <p class="meta">${p.showAuthor !== false ? "Autor • " : ""}${p.showReadingTime !== false ? "5 min leitura" : ""}</p>
          </div>
        </div>
        <aside class="heropost-side">
          ${Array.from({ length: parseInt(p.sideCount || "4") }).map((_, i) => `
            <div class="side-post"><span class="side-num">${i + 1}</span><span>Post recente ${i + 1}</span></div>
          `).join("")}
        </aside>
      </section>`;

    case "PostCarousel":
      return `<section class="section-posts">
        <div class="section-header-row">
          <div><h2>${esc(p.title || "Posts")}</h2>${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ""}</div>
          ${p.viewAllHref ? `<a href="${esc(p.viewAllHref)}" class="view-all">Ver todos →</a>` : ""}
        </div>
        <div class="post-list">
          ${Array.from({ length: parseInt(p.limit || "5") }).map((_, i) => `
            <div class="post-list-item"><span class="post-num">${i + 1}</span><div class="post-list-text"><span class="post-title">Post titulo ${i + 1}</span>${p.showCategory !== false ? `<span class="tag small">Categoria</span>` : ""}</div></div>
          `).join("")}
        </div>
      </section>`;

    case "PostGrid":
      return `<section class="section-posts">
        <div class="section-header-row">
          <div><h2>${esc(p.title || "Posts")}</h2>${p.subtitle ? `<p class="subtitle">${esc(p.subtitle)}</p>` : ""}</div>
          ${p.viewAllHref ? `<a href="${esc(p.viewAllHref)}" class="view-all">Ver todos →</a>` : ""}
        </div>
        <div class="post-grid cols-${p.columns || "3"}">
          ${Array.from({ length: parseInt(p.limit || "6") }).map((_, i) => `
            <div class="post-card"><div class="placeholder-img small"></div><div class="post-card-body">${p.showCategory !== false ? `<span class="tag small">Categoria</span>` : ""}<h3>Post ${i + 1}</h3>${p.showReadingTime !== false ? `<span class="meta">5 min</span>` : ""}</div></div>
          `).join("")}
        </div>
      </section>`;

    case "PostGridWithSidebar":
      return `<section class="section-grid-sidebar">
        <div class="grid-main">
          <h2>${esc(p.gridTitle || "Posts")}</h2>
          <div class="post-grid cols-${p.gridColumns || "2"}">
            ${Array.from({ length: parseInt(p.gridLimit || "4") }).map((_, i) => `
              <div class="post-card"><div class="placeholder-img small"></div><div class="post-card-body">${p.gridShowCategory !== false ? `<span class="tag small">Categoria</span>` : ""}<h3>Post ${i + 1}</h3></div></div>
            `).join("")}
          </div>
        </div>
        <aside class="grid-sidebar">
          <h3>${esc(p.sidebarTitle || "Destaques")}</h3>
          ${Array.from({ length: parseInt(p.sidebarLimit || "5") }).map((_, i) => `
            <div class="side-post"><span class="side-num">${i + 1}</span><span>Post ${i + 1}</span></div>
          `).join("")}
        </aside>
      </section>`;

    case "CategoryBar":
      return `<section class="section-catbar">
        ${p.title ? `<h3>${esc(p.title)}</h3>` : ""}
        <div class="catbar-list">
          ${Array.from({ length: parseInt(p.limit || "5") }).map((_, i) => `<span class="cat-pill">Categoria ${i + 1}</span>`).join("")}
        </div>
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

    case "ProductShowcase":
      return `<section class="section-products">
        <h2>${esc(p.title || "Produtos")}</h2>
        <div class="product-grid cols-${p.columns || "4"}">
          ${Array.from({ length: parseInt(p.limit || "4") }).map((_, i) => `
            <div class="product-card"><div class="placeholder-img small"></div><h4>Produto ${i + 1}</h4>${p.showDescription ? `<p class="meta">Descricao do produto</p>` : ""}</div>
          `).join("")}
        </div>
        ${p.viewAllHref ? `<a href="${esc(p.viewAllHref)}" class="view-all center">Ver todos →</a>` : ""}
      </section>`;

    case "WhatsAppCTA":
      return `<section class="section-wpp" style="background:${p.style === "dark" ? "#1a1a1a" : p.style === "brand" ? "#075e54" : "#f0fdf4"}; color:${p.style === "light" ? "#1a1a1a" : "#fff"}">
        <h2>${esc(p.title || "Fale com um Farmaceutico")}</h2>
        <p>${esc(p.description || "")}</p>
        <button class="wpp-btn">${esc(p.buttonText || "Iniciar conversa")}</button>
      </section>`;

    case "Footer":
      return `<footer class="section-footer">
        ${p.showNewsletter !== false ? `<div class="footer-newsletter"><h4>Newsletter</h4><div class="newsletter-form"><input type="email" placeholder="seu@email.com" /><button>Assinar</button></div></div>` : ""}
        ${p.showSocial !== false ? `<div class="footer-social"><span class="social-icon">f</span><span class="social-icon">ig</span><span class="social-icon">yt</span></div>` : ""}
        <p class="footer-copy">© 2026 — Todos os direitos reservados</p>
        ${p.showPrivacy !== false ? `<a href="#" class="footer-link">Politica de Privacidade</a>` : ""}
      </footer>`;

    default:
      return `<section class="section-unknown">
        <div class="unknown-header"><span class="section-badge">${index + 1}</span> ${esc(s.component)}</div>
        <div class="unknown-props">${Object.entries(p).map(([k, v]) => `<span class="prop-pill"><b>${esc(k)}</b>: ${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`).join("")}</div>
      </section>`;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  if (useSections) {
    const sections = (page.draftSections ?? page.sections) as { component: string; props: Record<string, any> }[] | null;
    if (sections && sections.length > 0) {
      const renderedSections = sections.map((s, i) => renderSection(s, i)).join("\n");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview: ${esc(page.title ?? "")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; }
    h1, h2, h3, h4 { font-family: 'Playfair Display', serif; }
    img { max-width: 100%; height: auto; display: block; }
    .preview-bar { position: sticky; top: 0; z-index: 100; background: #f59e0b; color: #000; padding: 6px 16px; font-size: 11px; font-weight: 600; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }

    /* Banner */
    .section-banner { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .banner-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .banner-overlay { position: relative; z-index: 1; text-align: center; padding: 40px 24px; }
    .banner-title { font-size: 1.5rem; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.5); }
    .banner-desc { margin-top: 8px; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.4); }
    .banner-link { display: inline-block; margin-top: 12px; color: #fff; font-weight: 600; text-decoration: underline; }

    /* Hero */
    .section-hero { min-height: 400px; display: flex; align-items: center; background-size: cover; background-position: center; padding: 60px 24px; }
    .hero-dark { background-color: #111; color: #fff; }
    .hero-content { max-width: 700px; margin: 0 auto; }
    .hero-title { font-size: 2.5rem; margin-bottom: 12px; }
    .hero-subtitle { font-size: 1.1rem; opacity: 0.85; margin-bottom: 16px; }
    .hero-cta { display: inline-block; margin-top: 16px; padding: 12px 28px; background: #1a1a1a; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .hero-dark .hero-cta { background: #fff; color: #1a1a1a; }

    /* HeroPost */
    .section-heropost { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 24px; max-width: 1200px; margin: 0 auto; }
    .heropost-main { position: relative; border-radius: 12px; overflow: hidden; }
    .heropost-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(transparent, rgba(0,0,0,.7)); color: #fff; }
    .heropost-info h2 { font-size: 1.5rem; }
    .heropost-side { display: flex; flex-direction: column; gap: 8px; }
    .side-post { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: #f9fafb; font-size: 13px; }
    .side-num { font-weight: 700; color: #9ca3af; font-size: 18px; min-width: 24px; }

    /* Posts */
    .section-posts { padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
    .section-header-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
    .section-header-row h2 { font-size: 1.4rem; }
    .subtitle { font-size: 0.9rem; color: #6b7280; margin-top: 4px; }
    .view-all { font-size: 13px; font-weight: 600; color: #0d61ac; text-decoration: none; }
    .view-all.center { display: block; text-align: center; margin-top: 20px; }
    .post-list { display: flex; flex-direction: column; gap: 6px; }
    .post-list-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: #f9fafb; }
    .post-num { font-weight: 700; font-size: 20px; color: #d1d5db; min-width: 28px; }
    .post-list-text { display: flex; flex-direction: column; gap: 4px; }
    .post-title { font-weight: 600; font-size: 14px; }
    .post-grid { display: grid; gap: 16px; }
    .post-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .post-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .post-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .post-card { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
    .post-card-body { padding: 12px; }
    .post-card-body h3 { font-size: 14px; margin-top: 4px; }

    /* Grid + sidebar */
    .section-grid-sidebar { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
    .grid-main h2, .grid-sidebar h3 { margin-bottom: 16px; }
    .grid-sidebar { display: flex; flex-direction: column; gap: 8px; }

    /* CategoryBar */
    .section-catbar { padding: 20px 24px; max-width: 1200px; margin: 0 auto; }
    .section-catbar h3 { font-size: 1rem; margin-bottom: 12px; }
    .catbar-list { display: flex; gap: 8px; flex-wrap: wrap; }
    .cat-pill { padding: 6px 14px; border-radius: 20px; background: #f3f4f6; font-size: 13px; font-weight: 500; }

    /* Features */
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

    /* Products */
    .section-products { padding: 32px 24px; max-width: 1200px; margin: 0 auto; }
    .section-products h2 { font-size: 1.4rem; margin-bottom: 20px; }
    .product-grid { display: grid; gap: 16px; }
    .product-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .product-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .product-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .product-card { border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; padding-bottom: 12px; }
    .product-card h4 { padding: 8px 12px 0; font-size: 14px; font-family: 'Inter', sans-serif; }
    .product-card .meta { padding: 0 12px; font-size: 12px; color: #6b7280; }

    /* WhatsApp CTA */
    .section-wpp { padding: 48px 24px; text-align: center; border-radius: 12px; margin: 24px; }
    .section-wpp h2 { font-size: 1.4rem; margin-bottom: 8px; }
    .section-wpp p { margin-bottom: 16px; opacity: 0.9; }
    .wpp-btn { padding: 12px 28px; border: none; border-radius: 24px; background: #25d366; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }

    /* Footer */
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

    /* Unknown fallback */
    .section-unknown { margin: 16px 24px; padding: 16px; border: 1px dashed #d1d5db; border-radius: 8px; }
    .unknown-header { font-weight: 600; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .unknown-props { display: flex; flex-wrap: wrap; gap: 6px; }
    .prop-pill { font-size: 11px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }

    /* Shared */
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
      .features-grid.cols-3, .features-grid.cols-4 { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="preview-bar">Preview — Rascunho</div>
  ${renderedSections}
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",

          "Cache-Control": "no-store",
        },
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
    .content h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 16px; color: #111; }
    .content h2 { font-size: 1.25rem; font-weight: 600; margin: 24px 0 12px; color: #222; }
    .content h3 { font-size: 1.1rem; font-weight: 600; margin: 20px 0 8px; color: #333; }
    .content p { margin-bottom: 12px; color: #444; }
    .content ul, .content ol { margin: 0 0 12px 24px; color: #444; }
    .content a { color: #0d61ac; }
    .content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="preview-bar">Preview — Rascunho</div>
  <main class="content">${content}</main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
    },
  });
}
