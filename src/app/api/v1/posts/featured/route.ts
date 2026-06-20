import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase, supabaseRowToCollectionItem,
} from "@/lib/neon-fallback";

function mapMedia(m: any) {
  if (!m) return null;
  return {
    id: m.id,
    url: m.url,
    alt: m.alt,
    sizes: {
      thumbnail: { url: m.thumbnailUrl },
      card: { url: m.cardUrl },
      hero: { url: m.heroUrl },
    },
  };
}

export const GET = withApiKey(async ({ tenantId, draft }) => {
  // ── Supabase shortcut when Neon is known down ─────────────────────────
  if (isNeonDown()) {
    const fb = await featuredFallback(tenantId, draft);
    if (fb) return fb;
  }

  try {
    const conditions: any[] = [eq(posts.tenantId, tenantId), eq(posts.featured, true)];

    if (!draft) {
      conditions.push(eq(posts.status, "published"));
    }

    const row = await db.query.posts.findFirst({
      where: and(...conditions),
      with: {
        category: true,
        author: { with: { avatar: true } },
        heroImage: true,
        tags: true,
      },
      orderBy: [desc(posts.publishedAt)],
    });

    if (!row) {
      return NextResponse.json({ error: "No featured post found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      coverUrl: row.coverUrl,
      publishedAt: row.publishedAt,
      status: row.status,
      featured: row.featured,
      readingTimeMinutes: row.readingTimeMinutes,
      category: row.category
        ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
        : null,
      author: row.author
        ? {
            id: row.author.id,
            name: row.author.name,
            slug: row.author.slug,
            bio: row.author.bio,
            avatar: row.author.avatar ? { url: row.author.avatar.url } : null,
          }
        : null,
      heroImage: mapMedia(row.heroImage),
      tags: (row.tags ?? []).map((t: any) => ({ tag: t.tag })),
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    const fb = await featuredFallback(tenantId, draft);
    if (fb) return fb;
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase fallback for featured post ─────────────────────────────────────

async function featuredFallback(
  tenantId: number,
  draft: boolean,
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "posts");
  if (!config) return null;

  const filters: Record<string, string> = { featured: "eq.true" };
  if (!draft) filters.status = "eq.published";

  const result = await querySupabase(config.supabaseTable, {
    filters,
    order: "created_at.desc",
    limit: 1,
  });

  if (!result || result.data.length === 0) {
    return NextResponse.json({ error: "No featured post found" }, { status: 404 });
  }

  const row = result.data[0] as Record<string, unknown>;
  const item = supabaseRowToCollectionItem(row, config.fieldMap);
  const d = item.data as Record<string, any>;

  return NextResponse.json({
    id: item.id,
    title: d.title || null,
    slug: item.slug,
    excerpt: d.excerpt || null,
    coverUrl: d.coverUrl || d.cover_url || d.heroImage || d.hero_image || null,
    publishedAt: item.publishedAt,
    status: item.status,
    featured: item.featured,
    readingTimeMinutes: d.readingTimeMinutes || d.reading_time_minutes || null,
    category: d.category && typeof d.category === "object"
      ? { id: d.category.id || null, name: d.category.name || null, slug: d.category.slug || null }
      : null,
    author: d.author && typeof d.author === "object"
      ? { id: d.author.id || null, name: d.author.name || null, slug: d.author.slug || null, bio: null, avatar: null }
      : null,
    heroImage: null,
    tags: [],
    _fallback: "supabase",
  });
}
