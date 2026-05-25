import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { eq, desc, and } from "drizzle-orm";

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
});
