import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  cacheSyncConfig, getCachedSyncConfig, type CachedSyncConfig,
  querySupabase,
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

function mapCollectionItemToFeatured(item: typeof collectionItems.$inferSelect) {
  const d = (item.data ?? {}) as Record<string, any>;
  const imageUrl = d.hero_image || d.heroImage || d.cover_url || d.coverUrl || d.cover_image_url || null;
  const cat = typeof d.category === "object" && d.category ? d.category : null;
  const auth = typeof d.author === "object" && d.author ? d.author : null;

  return {
    id: item.id,
    title: d.title || null,
    slug: item.slug,
    excerpt: d.excerpt || null,
    coverUrl: d.cover_url || d.coverUrl || d.cover_image_url || imageUrl,
    publishedAt: item.publishedAt,
    status: item.status,
    featured: item.featured,
    readingTimeMinutes: d.reading_time_minutes || d.readingTimeMinutes || null,
    category: cat ? { id: cat.id || null, name: cat.name, slug: cat.slug || null } : null,
    author: auth
      ? {
          id: auth.id || null,
          name: auth.name,
          slug: auth.slug || null,
          bio: auth.bio || null,
          avatar: auth.avatar ? { url: typeof auth.avatar === "string" ? auth.avatar : auth.avatar.url } : null,
        }
      : null,
    heroImage: imageUrl
      ? { id: null, url: imageUrl, alt: d.title || "", sizes: { thumbnail: { url: imageUrl }, card: { url: imageUrl }, hero: { url: imageUrl } } }
      : null,
    tags: Array.isArray(d.tags)
      ? d.tags.map((t: any) => ({ tag: typeof t === "string" ? t : t.tag }))
      : [],
  };
}

export const GET = withApiKey(async ({ tenantId, draft }) => {
  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await featuredFromSupabase(tenantId, draft);
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    // ── Try collection_items first ─────────────────────────────────────────
    const postsCollection = await db.query.collections.findFirst({
      where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "posts")),
    });

    if (postsCollection?.syncConfig && postsCollection.source === "synced") {
      cacheSyncConfig(tenantId, "posts", postsCollection.syncConfig as CachedSyncConfig);
    }

    if (postsCollection) {
      const conditions: any[] = [
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, postsCollection.id),
        eq(collectionItems.featured, true),
        isNull(collectionItems.deletedAt),
      ];

      if (!draft) {
        conditions.push(eq(collectionItems.status, "published"));
      }

      const item = await db.query.collectionItems.findFirst({
        where: and(...conditions),
        orderBy: [desc(collectionItems.publishedAt)],
      });

      if (item) {
        return NextResponse.json(mapCollectionItemToFeatured(item));
      }

      return NextResponse.json({ error: "No featured post found" }, { status: 404 });
    }

    // ── Fallback: legacy posts table ───────────────────────────────────────
    const conditions: any[] = [eq(posts.tenantId, tenantId), eq(posts.featured, true)];

    if (!draft) {
      conditions.push(eq(posts.status, "published"));
    }

    const row = await legacyDb.query.posts.findFirst({
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
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase primary for featured post ──────────────────────────────────────

async function featuredFromSupabase(
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

  const row = result.data[0] as Record<string, any>;
  const imageUrl = row.cover_image_url || row.embalagem_mockup || null;

  return NextResponse.json({
    id: row.id,
    title: row.title || null,
    slug: row.slug,
    excerpt: row.excerpt || null,
    coverUrl: imageUrl,
    publishedAt: row.published_at || row.published_date || row.created_at,
    status: row.status || "published",
    featured: row.featured || false,
    readingTimeMinutes: row.reading_time_minutes || null,
    category: null,
    author: row.author_name
      ? { id: null, name: row.author_name, slug: null, bio: null, avatar: null }
      : null,
    heroImage: imageUrl
      ? { id: null, url: imageUrl, alt: row.cover_image_alt || row.title || "", sizes: { thumbnail: { url: imageUrl }, card: { url: imageUrl }, hero: { url: imageUrl } } }
      : null,
    tags: [],
    _fallback: "supabase",
  });
}
