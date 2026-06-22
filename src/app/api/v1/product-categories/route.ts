import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { productCategories } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, asc, isNull, desc } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

export const GET = withApiKey(async ({ tenantId }) => {
  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await productCategoriesFromSupabase(tenantId);
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    // ── Try "categorias" collection first ──────────────────────────────────
    const catCollection = await db.query.collections.findFirst({
      where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "categorias")),
    });

    if (catCollection) {
      const items = await db.query.collectionItems.findMany({
        where: and(
          eq(collectionItems.tenantId, tenantId),
          eq(collectionItems.collectionId, catCollection.id),
          eq(collectionItems.status, "published"),
          isNull(collectionItems.deletedAt),
        ),
        orderBy: [asc(collectionItems.slug)],
      });

      return NextResponse.json({
        docs: items.map((item) => {
          const d = (item.data ?? {}) as Record<string, any>;
          return {
            id: item.id,
            name: d.name || null,
            slug: item.slug,
            description: d.description || null,
            parentId: null,
            sortOrder: 0,
            image: null,
          };
        }),
      });
    }

    // ── Fallback: legacy product_categories table ────────────────────────────
    const rows = await legacyDb.query.productCategories.findMany({
      where: eq(productCategories.tenantId, tenantId),
      orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
      with: { image: true },
    });

    return NextResponse.json({
      docs: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        parentId: r.parentId,
        sortOrder: r.sortOrder,
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

// ── Supabase primary for product categories ─────────────────────────────────

async function productCategoriesFromSupabase(tenantId: number): Promise<NextResponse | null> {
  // Try "categorias" sync config first, then "categorias-produto"
  const config =
    getCachedSyncConfig(tenantId, "categorias") ||
    getCachedSyncConfig(tenantId, "categorias-produto");
  if (!config) return null;

  const result = await querySupabase(config.supabaseTable, {
    order: "name.asc",
  });

  if (!result) return null;

  const docs = result.data.map((row: any) => ({
    id: row.id,
    name: row.name || null,
    slug: row.slug || null,
    description: row.description || null,
    parentId: null,
    sortOrder: 0,
    image: null,
  }));

  return NextResponse.json({ docs, _fallback: "supabase" });
}
