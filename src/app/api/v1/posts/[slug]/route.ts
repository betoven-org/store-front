import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  cacheSyncConfig, getCachedSyncConfig, type CachedSyncConfig,
  querySupabase, supabaseRowToCollectionItem,
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

  // ── Supabase shortcut when Neon is known down ─────────────────────────
  if (isNeonDown()) {
    const fb = await postBySlugFallback(tenantId, slug, draft);
    if (fb) return fb;
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
    }

    // ── Fallback: legacy posts table ───────────────────────────────────────

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
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImageUrl: row.ogImageUrl,
      canonicalUrl: row.canonicalUrl,
      noindex: row.noindex,
      nofollow: row.nofollow,
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
    const fb = await postBySlugFallback(tenantId, slug, draft);
    if (fb) return fb;
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase fallback for single post ───────────────────────────────────────

async function postBySlugFallback(
  tenantId: number,
  slug: string,
  draft: boolean,
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "posts");
  if (!config) return null;

  const filters: Record<string, string> = { slug: `eq.${slug}` };
  if (!draft) filters.status = "eq.published";

  const result = await querySupabase(config.supabaseTable, { filters, limit: 1 });
  if (!result || result.data.length === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const row = result.data[0] as Record<string, any>;

  // Resolve category UUID → name from Supabase
  let category = null;
  if (row.category_id) {
    const catConfig = getCachedSyncConfig(tenantId, "categorias");
    if (catConfig) {
      const catResult = await querySupabase(catConfig.supabaseTable, {
        filters: { id: `eq.${row.category_id}` },
        limit: 1,
      });
      if (catResult?.data?.[0]) {
        const c = catResult.data[0] as Record<string, any>;
        category = { id: c.id, name: c.name, slug: c.slug };
      }
    }
  }

  // Wrap raw content in TipTap format for the storefront renderer
  const rawContent = row.content;
  const content = typeof rawContent === "string" ? { type: "doc", _html: rawContent } : rawContent;

  const imageUrl = row.cover_image_url || row.embalagem_mockup || null;

  return NextResponse.json({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content,
    coverUrl: imageUrl,
    publishedAt: row.published_at || row.published_date || row.created_at,
    status: row.status,
    featured: row.featured || false,
    readingTimeMinutes: row.reading_time_minutes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metaTitle: row.meta_title || null,
    metaDescription: row.meta_description || null,
    ogTitle: row.og_title || null,
    ogDescription: row.og_description || null,
    ogImageUrl: row.og_image_url || null,
    canonicalUrl: row.canonical_url || null,
    noindex: row.noindex ?? false,
    nofollow: row.nofollow ?? false,
    category,
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
