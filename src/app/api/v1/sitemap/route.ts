import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, products, categories, productCategories, pages, tenants } from "@brasa/core/schema";
import { eq, and, desc } from "drizzle-orm";

async function getFrontendUrl(tenantId: number): Promise<string> {
  const [tenant] = await db
    .select({ frontendUrl: tenants.frontendUrl })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return (tenant?.frontendUrl || "https://localhost:3000").replace(/\/+$/, "");
}

function toLastmod(date: string | null | undefined): string {
  if (!date) return "";
  return `\n    <lastmod>${new Date(date).toISOString()}</lastmod>`;
}

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}

export const GET = withApiKey(async ({ tenantId }, req) => {
  const type = req.nextUrl.searchParams.get("type") || "index";
  const baseUrl = await getFrontendUrl(tenantId);

  // ── Index ──────────────────────────────────────────────────────────────
  if (type === "index") {
    const sitemaps = ["paginas", "posts", "produtos", "categorias"];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>\n    <loc>${baseUrl}/sitemaps/${s}.xml</loc>\n  </sitemap>`).join("\n")}
</sitemapindex>`;
    return xmlResponse(xml) as unknown as NextResponse;
  }

  // ── Posts ───────────────────────────────────────────────────────────────
  if (type === "posts") {
    const rows = await db
      .select({ slug: posts.slug, updatedAt: posts.updatedAt, publishedAt: posts.publishedAt })
      .from(posts)
      .where(and(eq(posts.tenantId, tenantId), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt));

    const urls = [
      `  <url>\n    <loc>${baseUrl}/blog</loc>\n  </url>`,
      ...rows.map((p) =>
        `  <url>\n    <loc>${baseUrl}/posts/${p.slug}</loc>${toLastmod(p.publishedAt || p.updatedAt)}\n  </url>`
      ),
    ];

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`) as unknown as NextResponse;
  }

  // ── Produtos ───────────────────────────────────────────────────────────
  if (type === "produtos") {
    const [productRows, catRows] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.status, "published"), eq(products.showOnSite, true))),
      db
        .select({ slug: productCategories.slug })
        .from(productCategories)
        .where(eq(productCategories.tenantId, tenantId)),
    ]);

    const urls = [
      `  <url>\n    <loc>${baseUrl}/produtos</loc>\n  </url>`,
      ...catRows.map((c) =>
        `  <url>\n    <loc>${baseUrl}/produtos/${c.slug}</loc>\n  </url>`
      ),
      ...productRows.map((p) =>
        `  <url>\n    <loc>${baseUrl}/${p.slug}/p</loc>${toLastmod(p.updatedAt)}\n  </url>`
      ),
    ];

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`) as unknown as NextResponse;
  }

  // ── Categorias ─────────────────────────────────────────────────────────
  if (type === "categorias") {
    const rows = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.tenantId, tenantId));

    const urls = [
      `  <url>\n    <loc>${baseUrl}/categorias</loc>\n  </url>`,
      ...rows.map((c) =>
        `  <url>\n    <loc>${baseUrl}/categorias/${c.slug}</loc>\n  </url>`
      ),
    ];

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`) as unknown as NextResponse;
  }

  // ── Paginas ────────────────────────────────────────────────────────────
  if (type === "paginas") {
    const rows = await db
      .select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages)
      .where(eq(pages.tenantId, tenantId));

    const urls = [
      `  <url>\n    <loc>${baseUrl}</loc>\n  </url>`,
      ...rows
        .filter((p) => p.slug !== "home")
        .map((p) =>
          `  <url>\n    <loc>${baseUrl}/${p.slug}</loc>${toLastmod(p.updatedAt)}\n  </url>`
        ),
    ];

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`) as unknown as NextResponse;
  }

  return NextResponse.json({ error: "Invalid type. Use: index, posts, produtos, categorias, paginas" }, { status: 400 });
});
