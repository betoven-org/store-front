import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories, authors, media } from "@brasa/core/schema";
import { eq, desc, and } from "drizzle-orm";

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

export const GET = withApiKey(async ({ tenantId }) => {
  const published = and(eq(posts.status, "published"), eq(posts.tenantId, tenantId));

  const result = await db
    .select(baseSelect)
    .from(posts)
    .leftJoin(media, eq(posts.heroImageId, media.id))
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .leftJoin(authors, eq(posts.authorId, authors.id))
    .where(and(published, eq(posts.featured, true)))
    .orderBy(desc(posts.publishedAt))
    .limit(1);

  if (result.length === 0) {
    // Fallback: most recent post
    const fallback = await db
      .select(baseSelect)
      .from(posts)
      .leftJoin(media, eq(posts.heroImageId, media.id))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(authors, eq(posts.authorId, authors.id))
      .where(published)
      .orderBy(desc(posts.publishedAt))
      .limit(1);

    return NextResponse.json(fallback[0] ?? null);
  }

  return NextResponse.json(result[0]);
});
