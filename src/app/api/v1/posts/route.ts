import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories, authors, media, requestMetrics } from "@brasa/core/schema";
import { eq, desc, and, sql, inArray, gte } from "drizzle-orm";

const baseSelect = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  excerpt: posts.excerpt,
  coverUrl: posts.coverUrl,
  heroImageUrl: media.url,
  categoryName: categories.name,
  categorySlug: categories.slug,
  authorName: authors.name,
  publishedAt: posts.publishedAt,
  readingTimeMinutes: posts.readingTimeMinutes,
};

function baseFrom() {
  return db
    .select(baseSelect)
    .from(posts)
    .leftJoin(media, eq(posts.heroImageId, media.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(authors, eq(posts.authorId, authors.id))
    .$dynamic();
}

export const GET = withApiKey(async ({ tenantId, draft }, req) => {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("mode") || "recent";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "10")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

  const statusFilter = draft ? undefined : eq(posts.status, "published");
  const published = and(statusFilter, eq(posts.tenantId, tenantId));

  if (mode === "recent") {
    const docs = await baseFrom()
      .where(published)
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset);
    return NextResponse.json({ docs });
  }

  if (mode === "editor-picks") {
    const docs = await baseFrom()
      .where(and(published, eq(posts.featured, true)))
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset);
    return NextResponse.json({ docs });
  }

  if (mode === "trending" || mode === "popular") {
    const conditions = [
      eq(requestMetrics.tenantId, tenantId),
      eq(requestMetrics.isBot, false),
      sql`${requestMetrics.path} NOT LIKE '/admin%'`,
      sql`${requestMetrics.path} NOT LIKE '/api%'`,
      sql`${requestMetrics.path} NOT LIKE '%/p'`,
      sql`${requestMetrics.path} != '/'`,
    ];

    if (mode === "trending") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      conditions.push(gte(requestMetrics.createdAt, sevenDaysAgo));
    }

    const topPaths = await db
      .select({
        slug: sql<string>`replace(${requestMetrics.path}, '/', '')`,
        views: sql<number>`count(*)::int`,
      })
      .from(requestMetrics)
      .where(and(...conditions))
      .groupBy(requestMetrics.path)
      .orderBy(sql`count(*) desc`)
      .limit(limit * 2);

    if (topPaths.length === 0) {
      const docs = await baseFrom()
        .where(published)
        .orderBy(desc(posts.publishedAt))
        .limit(limit);
      return NextResponse.json({ docs });
    }

    const slugs = topPaths.map((p) => p.slug);
    const viewsMap = Object.fromEntries(topPaths.map((p) => [p.slug, p.views]));

    const result = await baseFrom()
      .where(and(published, inArray(posts.slug, slugs)))
      .limit(limit);

    const docs = result
      .map((p) => ({ ...p, views: viewsMap[p.slug] || 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);

    return NextResponse.json({ docs });
  }

  // Default: recent
  const docs = await baseFrom()
    .where(published)
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);
  return NextResponse.json({ docs });
});
