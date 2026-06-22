import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { categories, posts } from "@brasa/core/schema";
import { eq, and, asc, count } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

export const GET = withApiKey(async ({ tenantId }) => {
  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await categoriesFromSupabase(tenantId);
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        postCount: count(posts.id),
      })
      .from(categories)
      .leftJoin(
        posts,
        and(
          eq(posts.categoryId, categories.id),
          eq(posts.status, "published"),
          eq(posts.tenantId, tenantId),
        ),
      )
      .where(eq(categories.tenantId, tenantId))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    return NextResponse.json({ docs: rows });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase primary for categories ─────────────────────────────────────────

async function categoriesFromSupabase(tenantId: number): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "categorias");
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
    postCount: 0,
  }));

  return NextResponse.json({ docs, _fallback: "supabase" });
}
