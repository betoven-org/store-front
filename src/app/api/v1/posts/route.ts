import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { posts, categories, authors, media, tags } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, desc, and, ilike, or, sql, count, isNull } from "drizzle-orm";

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
  return {
    id: item.id,
    title: d.title || d.titulo || null,
    slug: item.slug,
    excerpt: d.excerpt || d.resumo || null,
    coverUrl: d.coverUrl || d.cover_url || d.hero_image || null,
    publishedAt: item.publishedAt,
    status: item.status,
    featured: item.featured,
    readingTimeMinutes: d.readingTimeMinutes || d.reading_time_minutes || d.reading_time || null,
    category: d.category
      ? { id: d.category.id || null, name: d.category.name || d.category, slug: d.category.slug || null }
      : d.categoryName
        ? { id: null, name: d.categoryName, slug: d.categorySlug || null }
        : null,
    author: d.author
      ? {
          id: d.author.id || null,
          name: d.author.name || d.author,
          slug: d.author.slug || null,
          bio: d.author.bio || null,
          avatar: d.author.avatar ? { url: typeof d.author.avatar === "string" ? d.author.avatar : d.author.avatar.url } : null,
        }
      : d.authorName
        ? { id: null, name: d.authorName, slug: d.authorSlug || null, bio: null, avatar: null }
        : null,
    heroImage: d.hero_image || d.heroImage
      ? { id: null, url: d.hero_image || d.heroImage, alt: d.title || "", sizes: { thumbnail: { url: null }, card: { url: null }, hero: { url: d.hero_image || d.heroImage } } }
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

  // ── Collections layer disabled — migration incomplete, using legacy tables
  // TODO: re-enable after fixing collection_items data migration (hero_image, category, author)
  const postsCollection = null; // await db.query.collections.findFirst(...)

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
      // Filter by category in jsonb data
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

  // ── Fallback: legacy posts table ─────────────────────────────────────────

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
});
