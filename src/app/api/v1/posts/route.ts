import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { posts, categories, authors, media, tags } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, desc, and, ilike, or, sql, count, isNull } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  cacheSyncConfig, getCachedSyncConfig, type CachedSyncConfig,
  querySupabase, supabaseRowToCollectionItem, findSupabaseColumn,
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

function mapPost(row: any) {
  return {
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
  };
}

// ── Transform collection item data → legacy post format ────────────────────

function mapCollectionItemToPost(item: typeof collectionItems.$inferSelect) {
  const d = (item.data ?? {}) as Record<string, any>;
  const imageUrl = d.hero_image || d.heroImage || d.cover_url || d.coverUrl || null;
  const cat = typeof d.category === "object" && d.category ? d.category : null;
  const auth = typeof d.author === "object" && d.author ? d.author : null;

  return {
    id: item.id,
    title: d.title || null,
    slug: item.slug,
    excerpt: d.excerpt || null,
    coverUrl: d.cover_url || d.coverUrl || imageUrl,
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

export const GET = withApiKey(async ({ tenantId, draft }, req) => {
  const { searchParams } = req.nextUrl;

  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const offset = (page - 1) * limit;

  const categorySlug = searchParams.get("category");
  const authorId = searchParams.get("author");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search");
  const homeSection = searchParams.get("homeSection");

  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await postsFromSupabase(tenantId, { limit, page, offset, featured, search, homeSection, draft });
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

    // Warm sync config cache for future Supabase queries
    if (postsCollection?.syncConfig && postsCollection.source === "synced") {
      cacheSyncConfig(tenantId, "posts", postsCollection.syncConfig as CachedSyncConfig);
    }

    if (postsCollection) {
      const conditions: any[] = [
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, postsCollection.id),
        isNull(collectionItems.deletedAt),
      ];

      if (!draft) {
        conditions.push(eq(collectionItems.status, "published"));
      }

      if (featured === "true") {
        conditions.push(eq(collectionItems.featured, true));
      }

      if (categorySlug) {
        conditions.push(
          or(
            sql`${collectionItems.data}->>'categorySlug' = ${categorySlug}`,
            sql`${collectionItems.data}->'category'->>'slug' = ${categorySlug}`,
          ),
        );
      }

      if (search) {
        conditions.push(
          or(
            sql`${collectionItems.data}->>'title' ILIKE ${"%" + search + "%"}`,
            sql`${collectionItems.data}->>'excerpt' ILIKE ${"%" + search + "%"}`,
            ilike(collectionItems.slug, `%${search}%`),
          ),
        );
      }

      const whereClause = and(...conditions);

      const [{ total }] = await db
        .select({ total: count() })
        .from(collectionItems)
        .where(whereClause);

      const totalDocs = Number(total);
      const totalPages = Math.ceil(totalDocs / limit);

      const items = await db.query.collectionItems.findMany({
        where: whereClause,
        orderBy: [desc(collectionItems.publishedAt)],
        limit,
        offset,
      });

      const docs = items.map(mapCollectionItemToPost);

      return NextResponse.json({
        docs,
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      });
    }

    // ── Fallback: legacy posts table ───────────────────────────────────────

    const conditions: any[] = [eq(posts.tenantId, tenantId)];

    if (!draft) {
      conditions.push(eq(posts.status, "published"));
    }

    if (featured === "true") {
      conditions.push(eq(posts.featured, true));
    }

    if (authorId) {
      conditions.push(eq(posts.authorId, Number(authorId)));
    }

    if (categorySlug) {
      const categoryRow = await legacyDb.query.categories.findFirst({
        where: and(eq(categories.tenantId, tenantId), eq(categories.slug, categorySlug)),
      });
      if (categoryRow) {
        conditions.push(eq(posts.categoryId, categoryRow.id));
      } else {
        return NextResponse.json({
          docs: [],
          totalDocs: 0,
          totalPages: 0,
          page,
          limit,
          hasNextPage: false,
          hasPrevPage: false,
        });
      }
    }

    if (search) {
      conditions.push(
        or(ilike(posts.title, `%${search}%`), ilike(posts.excerpt, `%${search}%`)),
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await legacyDb
      .select({ total: count() })
      .from(posts)
      .where(whereClause);

    const totalDocs = Number(total);
    const totalPages = Math.ceil(totalDocs / limit);

    const rows = await legacyDb.query.posts.findMany({
      where: whereClause,
      with: {
        category: true,
        author: { with: { avatar: true } },
        heroImage: true,
        tags: true,
      },
      orderBy: [desc(posts.publishedAt)],
      limit,
      offset,
    });

    const docs = rows.map(mapPost);

    return NextResponse.json({
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase primary for posts list ─────────────────────────────────────────

async function postsFromSupabase(
  tenantId: number,
  opts: { limit: number; page: number; offset: number; featured: string | null; search: string | null; homeSection: string | null; draft: boolean },
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "posts");
  if (!config) return null;

  const filters: Record<string, string> = {};
  if (!opts.draft) filters.status = "eq.published";
  if (opts.featured === "true") filters.featured = "eq.true";
  if (opts.homeSection) filters.home_section = `eq.${opts.homeSection}`;

  let orClause: string | undefined;
  if (opts.search) {
    const titleCol = findSupabaseColumn(config.fieldMap, "title");
    const excerptCol = findSupabaseColumn(config.fieldMap, "excerpt");
    const parts: string[] = [];
    if (titleCol) parts.push(`${titleCol}.ilike.%${opts.search}%`);
    if (excerptCol) parts.push(`${excerptCol}.ilike.%${opts.search}%`);
    if (parts.length > 0) orClause = `(${parts.join(",")})`;
  }

  const result = await querySupabase(config.supabaseTable, {
    filters,
    or: orClause,
    order: "created_at.desc",
    limit: opts.limit,
    offset: opts.offset,
  });

  if (!result) return null;

  const docs = result.data.map((row: any) => {
    const imageUrl = row.cover_image_url || null;
    return {
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
      author: row.author_name ? { id: null, name: row.author_name, slug: null, bio: null, avatar: null } : null,
      heroImage: imageUrl
        ? { id: null, url: imageUrl, alt: row.cover_image_alt || row.title || "", sizes: { thumbnail: { url: imageUrl }, card: { url: imageUrl }, hero: { url: imageUrl } } }
        : null,
      tags: [],
    };
  });

  const totalDocs = result.count;
  const totalPages = Math.ceil(totalDocs / opts.limit);

  return NextResponse.json({
    docs,
    totalDocs,
    totalPages,
    page: opts.page,
    limit: opts.limit,
    hasNextPage: opts.page < totalPages,
    hasPrevPage: opts.page > 1,
    _fallback: "supabase",
  });
}
