import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { products } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

// ── Transform collection item data → legacy product list format ────────────

function mapCollectionItemToProduct(item: typeof collectionItems.$inferSelect) {
  const d = (item.data ?? {}) as Record<string, any>;
  return {
    id: item.id,
    name: d.name || d.nome || null,
    slug: item.slug,
    description: d.description || d.descricao || null,
    brand: d.brand || d.marca || null,
    isKit: d.isKit || d.is_kit || false,
    featured: item.featured,
    publishedAt: item.publishedAt,
    category: d.category
      ? { id: d.category.id || null, name: d.category.name || d.category, slug: d.category.slug || null }
      : d.categoryName
        ? { id: null, name: d.categoryName, slug: d.categorySlug || null }
        : null,
    image: d.image || d.hero_image
      ? {
          url: typeof (d.image || d.hero_image) === "string" ? (d.image || d.hero_image) : (d.image?.url || d.hero_image),
          alt: d.image?.alt || d.name || "",
          thumbnailUrl: d.image?.thumbnailUrl || null,
        }
      : null,
  };
}

export const GET = withApiKey(async ({ tenantId }, req) => {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));
  const categoryId = searchParams.get("category");

  // ── Try collection_items first ───────────────────────────────────────────
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

    // Filter by category ID in jsonb if provided
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

    return NextResponse.json({
      docs: items.map(mapCollectionItemToProduct),
    });
  }

  // ── Fallback: legacy products table ──────────────────────────────────────

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
});
