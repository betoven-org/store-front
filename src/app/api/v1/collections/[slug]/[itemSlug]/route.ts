import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  cacheSyncConfig, getCachedSyncConfig, type CachedSyncConfig,
  querySupabase, mapSupabaseRow,
} from "@/lib/neon-fallback";

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug, itemSlug } = params;

  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await collectionItemFromSupabase(tenantId, slug, itemSlug);
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    const collection = await db.query.collections.findFirst({
      where: and(eq(collections.tenantId, tenantId), eq(collections.slug, slug)),
      with: { fields: { orderBy: [asc(collectionFields.sortOrder)] } },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.syncConfig && collection.source === "synced") {
      cacheSyncConfig(tenantId, slug, collection.syncConfig as CachedSyncConfig);
    }

    const item = await db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, collection.id),
        eq(collectionItems.slug, itemSlug),
        isNull(collectionItems.deletedAt),
      ),
    });

    if (!item || (!draft && item.status !== "published")) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      slug: item.slug,
      status: item.status,
      featured: item.featured,
      data: item.data,
      externalId: item.externalId,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      collection: {
        name: collection.name,
        slug: collection.slug,
        fields: collection.fields.map((f) => ({
          slug: f.slug,
          name: f.name,
          type: f.type,
          required: f.required,
          config: f.config,
        })),
      },
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

async function collectionItemFromSupabase(
  tenantId: number,
  collectionSlug: string,
  itemSlug: string,
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, collectionSlug);
  if (!config) return null;

  const result = await querySupabase(config.supabaseTable, {
    filters: { slug: `eq.${itemSlug}` },
    limit: 1,
  });

  if (!result || result.data.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const row = result.data[0] as Record<string, unknown>;
  const hasFieldMap = Object.keys(config.fieldMap).length > 0;
  const data = hasFieldMap ? mapSupabaseRow(row, config.fieldMap) : { ...row };

  return NextResponse.json({
    id: row.id,
    slug: (row.slug as string) || itemSlug,
    status: row.status === "published" ? "published" : "draft",
    featured: row.featured === true,
    data,
    externalId: String(row.id),
    publishedAt: (row.published_at as string) || (row.created_at as string) || null,
    createdAt: (row.created_at as string) || null,
    updatedAt: (row.updated_at as string) || null,
    collection: { name: collectionSlug, slug: collectionSlug, fields: [] },
    _fallback: "supabase",
  });
}
