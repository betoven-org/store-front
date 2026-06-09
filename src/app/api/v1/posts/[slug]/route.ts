import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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

// ── Transform collection item data → legacy single post format ─────────────

function mapCollectionItemToFullPost(item: typeof collectionItems.$inferSelect) {
  const d = (item.data ?? {}) as Record<string, any>;
  return {
    id: item.id,
    title: d.title || d.titulo || null,
    slug: item.slug,
    excerpt: d.excerpt || d.resumo || null,
    content: d.content || d.conteudo || null,
    coverUrl: d.coverUrl || d.cover_url || d.hero_image || null,
    publishedAt: item.publishedAt,
    status: item.status,
    featured: item.featured,
    readingTimeMinutes: d.readingTimeMinutes || d.reading_time_minutes || d.reading_time || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    // SEO fields
    metaTitle: d.metaTitle || d.meta_title || d.seoTitle || null,
    metaDescription: d.metaDescription || d.meta_description || d.seoDescription || null,
    ogTitle: d.ogTitle || d.og_title || null,
    ogDescription: d.ogDescription || d.og_description || null,
    ogImageUrl: d.ogImageUrl || d.og_image_url || null,
    canonicalUrl: d.canonicalUrl || d.canonical_url || null,
    noindex: d.noindex ?? false,
    nofollow: d.nofollow ?? false,
    // Relations
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

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug } = params;

  // ── Collections layer disabled — migration incomplete, using legacy tables
  const postsCollection = null;

  if (postsCollection) {
    const item = await db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, postsCollection.id),
        eq(collectionItems.slug, slug),
        isNull(collectionItems.deletedAt),
      ),
    });

    if (item && (draft || item.status === "published")) {
      return NextResponse.json(mapCollectionItemToFullPost(item));
    }

    if (item && !draft && item.status !== "published") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Item not found in collection — fall through to legacy
  }

  // ── Fallback: legacy posts table ─────────────────────────────────────────

  const row = await legacyDb.query.posts.findFirst({
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
