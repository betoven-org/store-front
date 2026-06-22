import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { products, media } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, desc, and, isNull, inArray, sql } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

// ── Resolve media IDs to URLs (batch) ────────────────────────────────────────

async function resolveMediaUrls(
  items: (typeof collectionItems.$inferSelect)[],
): Promise<Map<string, { url: string; alt: string }>> {
  const ids: number[] = [];
  for (const item of items) {
    const d = (item.data ?? {}) as Record<string, any>;
    const imgVal = d.image || d.hero_image;
    if (typeof imgVal === "string" && /^\d+$/.test(imgVal)) {
      ids.push(Number(imgVal));
    }
  }
  if (ids.length === 0) return new Map();

  const rows = await legacyDb
    .select({ id: media.id, url: media.url, alt: media.alt })
    .from(media)
    .where(inArray(media.id, [...new Set(ids)]));

  const map = new Map<string, { url: string; alt: string }>();
  for (const r of rows) {
    map.set(String(r.id), { url: r.url, alt: r.alt || "" });
  }
  return map;
}

// ── Resolve category UUIDs to { id, name, slug } (batch) ────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCategoryUuids(
  items: (typeof collectionItems.$inferSelect)[],
  tenantId: number,
): Promise<Map<string, { id: number; name: string; slug: string }>> {
  const uuids: string[] = [];
  for (const item of items) {
    const d = (item.data ?? {}) as Record<string, any>;
    const cat = d.category;
    if (typeof cat === "string" && UUID_RE.test(cat)) uuids.push(cat);
  }
  if (uuids.length === 0) return new Map();

  const catCollection = await db.query.collections.findFirst({
    where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "categorias")),
  });
  if (!catCollection) return new Map();

  const catItems = await db.query.collectionItems.findMany({
    where: and(
      eq(collectionItems.collectionId, catCollection.id),
      eq(collectionItems.tenantId, tenantId),
      inArray(collectionItems.externalId, [...new Set(uuids)]),
    ),
  });

  const map = new Map<string, { id: number; name: string; slug: string }>();
  for (const ci of catItems) {
    const cd = (ci.data ?? {}) as Record<string, any>;
    map.set(ci.externalId!, { id: ci.id, name: cd.name || "", slug: ci.slug });
  }
  return map;
}

// ── Build category object from data ─────────────────────────────────────────

function buildCategory(
  d: Record<string, any>,
  catMap: Map<string, { id: number; name: string; slug: string }>,
) {
  const cat = d.category;
  if (!cat) return d.categoryName ? { id: null, name: d.categoryName, slug: d.categorySlug || null } : null;
  // Already resolved object
  if (typeof cat === "object") return { id: cat.id || null, name: cat.name || null, slug: cat.slug || null };
  // Raw UUID string — resolve from map
  if (typeof cat === "string" && UUID_RE.test(cat)) {
    const resolved = catMap.get(cat);
    return resolved || null;
  }
  return null;
}

// ── Transform collection item data → legacy product list format ────────────

function mapCollectionItemToProduct(
  item: typeof collectionItems.$inferSelect,
  mediaMap: Map<string, { url: string; alt: string }>,
  catMap: Map<string, { id: number; name: string; slug: string }>,
) {
  const d = (item.data ?? {}) as Record<string, any>;
  const imgVal = d.image || d.hero_image;
  const resolved = typeof imgVal === "string" && /^\d+$/.test(imgVal)
    ? mediaMap.get(imgVal)
    : null;

  return {
    id: item.id,
    name: d.name || d.nome || null,
    slug: item.slug,
    description: d.description || d.descricao || null,
    brand: d.brand || d.marca || null,
    isKit: d.isKit || d.is_kit || false,
    featured: item.featured,
    publishedAt: item.publishedAt,
    category: buildCategory(d, catMap),
    image: resolved
      ? { url: resolved.url, alt: resolved.alt || d.name || "", thumbnailUrl: null }
      : imgVal
        ? {
            url: typeof imgVal === "string" ? imgVal : (imgVal?.url || null),
            alt: imgVal?.alt || d.name || "",
            thumbnailUrl: imgVal?.thumbnailUrl || null,
          }
        : null,
  };
}

export const GET = withApiKey(async ({ tenantId }, req) => {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));
  const categoryId = searchParams.get("category");

  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await productsFromSupabase(tenantId, { limit, offset });
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    // ── Try collection_items first ─────────────────────────────────────────
    const prodCollection = await db.query.collections.findFirst({
      where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "produtos")),
    });

    if (prodCollection) {
      const conditions: any[] = [
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, prodCollection.id),
        eq(collectionItems.status, "published"),
        isNull(collectionItems.deletedAt),
      ];

      if (categoryId) {
        conditions.push(
          sql`(${collectionItems.data}->'category'->>'id')::int = ${Number(categoryId)}`,
        );
      }

      const whereClause = and(...conditions);

      const items = await db.query.collectionItems.findMany({
        where: whereClause,
        orderBy: [desc(collectionItems.publishedAt)],
        limit,
        offset,
      });

      const [mediaMap, catMap] = await Promise.all([
        resolveMediaUrls(items),
        resolveCategoryUuids(items, tenantId),
      ]);

      return NextResponse.json({
        docs: items.map((item) => mapCollectionItemToProduct(item, mediaMap, catMap)),
      });
    }

    // ── Fallback: legacy products table ────────────────────────────────────

    const conditions = [
      eq(products.tenantId, tenantId),
      eq(products.status, "published"),
      eq(products.showOnSite, true),
    ];

    if (categoryId) {
      conditions.push(eq(products.productCategoryId, Number(categoryId)));
    }

    const rows = await legacyDb.query.products.findMany({
      where: and(...conditions),
      orderBy: [desc(products.publishedAt)],
      limit,
      offset,
      with: {
        category: true,
        image: true,
      },
    });

    return NextResponse.json({
      docs: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        brand: r.brand,
        isKit: r.isKit,
        featured: r.featured,
        publishedAt: r.publishedAt,
        category: r.category
          ? { id: r.category.id, name: r.category.name, slug: r.category.slug }
          : null,
        image: r.image
          ? { url: r.image.url, alt: r.image.alt, thumbnailUrl: r.image.thumbnailUrl }
          : null,
      })),
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase primary for products ───────────────────────────────────────────

async function productsFromSupabase(
  tenantId: number,
  opts: { limit: number; offset: number },
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "produtos");
  if (!config) return null;

  const result = await querySupabase(config.supabaseTable, {
    filters: { status: "eq.published" },
    order: "created_at.desc",
    limit: opts.limit,
    offset: opts.offset,
  });

  if (!result) return null;

  const docs = result.data.map((row: any) => ({
    id: row.id,
    name: row.title || row.name || null,
    slug: row.slug,
    description: row.excerpt || row.description || null,
    brand: row.brand || null,
    isKit: row.is_kit || false,
    featured: row.featured || false,
    publishedAt: row.published_at || row.published_date || row.created_at,
    category: null,
    image: row.cover_image_url
      ? { url: row.cover_image_url, alt: row.cover_image_alt || row.title || "", thumbnailUrl: null }
      : row.embalagem_mockup
        ? { url: row.embalagem_mockup, alt: row.title || "", thumbnailUrl: null }
        : null,
  }));

  return NextResponse.json({ docs, _fallback: "supabase" });
}
