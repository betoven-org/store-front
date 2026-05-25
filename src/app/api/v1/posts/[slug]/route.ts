import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { eq, and } from "drizzle-orm";

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

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug } = params;

  const row = await db.query.posts.findFirst({
    where: and(eq(posts.tenantId, tenantId), eq(posts.slug, slug)),
    with: {
      category: true,
      author: { with: { avatar: true } },
      heroImage: true,
      tags: true,
    },
  });

  if (!row || (!draft && row.status !== "published")) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverUrl: row.coverUrl,
    publishedAt: row.publishedAt,
    status: row.status,
    featured: row.featured,
    readingTimeMinutes: row.readingTimeMinutes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // SEO fields
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    nofollow: row.nofollow,
    // Relations
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
