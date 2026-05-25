import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories, authors, media, tags } from "@brasa/core/schema";
import { eq, desc, and, ilike, or, sql, count } from "drizzle-orm";

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

export const GET = withApiKey(async ({ tenantId, draft }, req) => {
  const { searchParams } = req.nextUrl;

  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const offset = (page - 1) * limit;

  const categorySlug = searchParams.get("category");
  const authorId = searchParams.get("author");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search");

  // Build conditions
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
    // Subquery to find category id by slug
    const categoryRow = await db.query.categories.findFirst({
      where: and(eq(categories.tenantId, tenantId), eq(categories.slug, categorySlug)),
    });
    if (categoryRow) {
      conditions.push(eq(posts.categoryId, categoryRow.id));
    } else {
      // No matching category — return empty
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

  // Count total
  const [{ total }] = await db
    .select({ total: count() })
    .from(posts)
    .where(whereClause);

  const totalDocs = Number(total);
  const totalPages = Math.ceil(totalDocs / limit);

  // Fetch posts with relations
  const rows = await db.query.posts.findMany({
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
