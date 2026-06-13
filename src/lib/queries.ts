import { unstable_cache } from "next/cache";
import { db } from "@brasa/core/db";
import {
  posts,
  categories,
  authors,
  media,
  tags,
  siteSettings,
  pages,
} from "@brasa/core/schema";
import { eq, and, ne, desc, asc, ilike, or, count, sql } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";
import {
  CACHE_TTL_VOLATILE,
  CACHE_TTL_EDITORIAL,
  CACHE_TTL_STABLE,
} from "@/lib/cache-config";

// ── Helpers ─────────────────────────────────────────────────────────────────────

type MediaRow = typeof media.$inferSelect;

function mapMedia(m: MediaRow | null | undefined) {
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
    content: row.content,
    coverUrl: row.coverUrl,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    focusKeyword: row.focusKeyword,
    secondaryKeywords: row.secondaryKeywords,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImageUrl: row.ogImageUrl,
    schemaType: row.schemaType,
    canonicalUrl: row.canonicalUrl,
    wordCount: row.wordCount,
    readingTimeMinutes: row.readingTimeMinutes,
    seoScore: row.seoScore,
    noindex: row.noindex,
    nofollow: row.nofollow,
    status: row.status,
    featured: row.featured,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.category ?? row.categoryId,
    author: row.author
      ? {
          id: row.author.id,
          name: row.author.name,
          slug: row.author.slug,
          bio: row.author.bio,
          avatar: row.author.avatar
            ? { url: row.author.avatar.url }
            : null,
        }
      : row.authorId,
    heroImage: mapMedia(row.heroImage),
    tags: (row.tags ?? []).map((t: any) => ({ tag: t.tag })),
  };
}

// ── Queries ─────────────────────────────────────────────────────────────────────

const _getSiteSettings = unstable_cache(
  async (tenantId: number) => {
    const row = await db.query.siteSettings.findFirst({
      where: eq(siteSettings.tenantId, tenantId),
      with: {
        logo: true,
        favicon: true,
      },
    });
    if (!row) {
      return {
        id: 0,
        siteName: "Meu Site",
        siteDescription: null,
        logoId: null,
        faviconId: null,
        whatsapp: null,
        facebook: null,
        instagram: null,
        youtube: null,
        footerText: null,
        copyrightText: null,
        newsletterTitle: null,
        newsletterDescription: null,
        newsletterConsent: null,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        privacyPolicy: null,
        robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api",
        supabaseUrl: null,
        supabaseAnonKey: null,
        supabaseServiceRoleKey: null,
        umamiWebsiteId: null,
        umamiUrl: null,
        supabaseSyncEnabled: false,
        lastSyncAt: null,
        updatedAt: new Date().toISOString(),
        logo: null,
        favicon: null,
      };
    }
    return {
      ...row,
      logo: mapMedia(row.logo),
      favicon: mapMedia(row.favicon),
    };
  },
  ["site-settings"],
  { revalidate: CACHE_TTL_STABLE, tags: ["settings"] },
);

export async function getSiteSettings() {
  const tenantId = await getTenantId();
  return _getSiteSettings(tenantId);
}

const _getFeaturedPost = unstable_cache(
  async (tenantId: number) => {
    const rows = await db.query.posts.findMany({
      where: and(
        eq(posts.tenantId, tenantId),
        eq(posts.status, "published"),
        eq(posts.featured, true),
      ),
      orderBy: [desc(posts.publishedAt)],
      limit: 1,
      with: {
        category: true,
        author: { with: { avatar: true } },
        heroImage: true,
        tags: true,
      },
    });
    if (!rows[0]) return null;
    return mapPost(rows[0]);
  },
  ["featured-post"],
  { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
);

export async function getFeaturedPost() {
  const tenantId = await getTenantId();
  return _getFeaturedPost(tenantId);
}

export async function getLatestPosts(limit = 9, page = 1) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const offset = (page - 1) * limit;

      const whereCondition = and(eq(posts.tenantId, tenantId), eq(posts.status, "published"));

      const [{ total }] = await db
        .select({ total: count() })
        .from(posts)
        .where(whereCondition);

      const rows = await db.query.posts.findMany({
        where: whereCondition,
        orderBy: [desc(posts.publishedAt)],
        limit,
        offset,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      const totalDocs = total;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        docs: rows.map(mapPost),
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    },
    ["latest-posts", String(tenantId), String(limit), String(page)],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
  )(tenantId);
}

const _getRecentPosts = unstable_cache(
  async (tenantId: number, limit = 5) => {
    const rows = await db.query.posts.findMany({
      where: and(eq(posts.tenantId, tenantId), eq(posts.status, "published")),
      orderBy: [desc(posts.createdAt)],
      limit,
      with: {
        category: true,
        author: { with: { avatar: true } },
        heroImage: true,
        tags: true,
      },
    });

    return { docs: rows.map(mapPost) };
  },
  ["recent-posts"],
  { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
);

export async function getRecentPosts(limit = 5) {
  const tenantId = await getTenantId();
  return _getRecentPosts(tenantId, limit);
}

export async function getPostBySlug(slug: string) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const row = await db.query.posts.findFirst({
        where: and(eq(posts.tenantId, tenantId), eq(posts.slug, slug)),
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });
      if (!row) return null;
      return mapPost(row);
    },
    ["post-by-slug", String(tenantId), slug],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
  )(tenantId);
}

export async function getPostsByCategory(
  categorySlug: string,
  limit = 12,
  page = 1,
) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const category = await db.query.categories.findFirst({
        where: and(eq(categories.tenantId, tenantId), eq(categories.slug, categorySlug)),
      });

      if (!category)
        return { docs: [], category: null, totalPages: 0, totalDocs: 0 };

      const whereCondition = and(
        eq(posts.tenantId, tenantId),
        eq(posts.status, "published"),
        eq(posts.categoryId, category.id),
      );

      const [{ total }] = await db
        .select({ total: count() })
        .from(posts)
        .where(whereCondition);

      const offset = (page - 1) * limit;

      const rows = await db.query.posts.findMany({
        where: whereCondition,
        orderBy: [desc(posts.publishedAt)],
        limit,
        offset,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      const totalDocs = total;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        docs: rows.map(mapPost),
        category,
        totalPages,
        totalDocs,
      };
    },
    ["posts-by-category", String(tenantId), categorySlug, String(limit), String(page)],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts", "categories"] },
  )(tenantId);
}

export async function getPostsByCategorySlug(
  categorySlug: string,
  limit = 6,
) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const category = await db.query.categories.findFirst({
        where: and(eq(categories.tenantId, tenantId), eq(categories.slug, categorySlug)),
      });

      if (!category) return { docs: [] };

      const rows = await db.query.posts.findMany({
        where: and(
          eq(posts.tenantId, tenantId),
          eq(posts.status, "published"),
          eq(posts.categoryId, category.id),
        ),
        orderBy: [desc(posts.publishedAt)],
        limit,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      return { docs: rows.map(mapPost) };
    },
    ["posts-by-cat-slug", String(tenantId), categorySlug, String(limit)],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
  )(tenantId);
}

export async function getRelatedPosts(
  categoryId: string | number,
  excludePostId: string | number,
  limit = 3,
) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const rows = await db.query.posts.findMany({
        where: and(
          eq(posts.tenantId, tenantId),
          eq(posts.status, "published"),
          eq(posts.categoryId, Number(categoryId)),
          ne(posts.id, Number(excludePostId)),
        ),
        orderBy: [desc(posts.publishedAt)],
        limit,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      return {
        docs: rows.map(mapPost),
        totalDocs: rows.length,
        totalPages: 1,
      };
    },
    ["related-posts", String(tenantId), String(categoryId), String(excludePostId)],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
  )(tenantId);
}

export async function searchPosts(
  query: string,
  categorySlug?: string,
  limit = 12,
  page = 1,
) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const searchPattern = `%${query}%`;
      const conditions = [
        eq(posts.tenantId, tenantId),
        eq(posts.status, "published"),
        or(
          ilike(posts.title, searchPattern),
          ilike(posts.excerpt, searchPattern),
        )!,
      ];

      if (categorySlug) {
        const category = await db.query.categories.findFirst({
          where: and(eq(categories.tenantId, tenantId), eq(categories.slug, categorySlug)),
        });
        if (category) {
          conditions.push(eq(posts.categoryId, category.id));
        }
      }

      const whereCondition = and(...conditions);
      const offset = (page - 1) * limit;

      const [{ total }] = await db
        .select({ total: count() })
        .from(posts)
        .where(whereCondition);

      const rows = await db.query.posts.findMany({
        where: whereCondition,
        orderBy: [desc(posts.publishedAt)],
        limit,
        offset,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      const totalDocs = total;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        docs: rows.map(mapPost),
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    },
    ["search-posts", String(tenantId), query, categorySlug ?? "", String(limit), String(page)],
    { revalidate: CACHE_TTL_VOLATILE, tags: ["posts"] },
  )(tenantId);
}

export async function getPostsByAuthor(
  authorId: string | number,
  limit = 12,
  page = 1,
) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const whereCondition = and(
        eq(posts.tenantId, tenantId),
        eq(posts.status, "published"),
        eq(posts.authorId, Number(authorId)),
      );

      const offset = (page - 1) * limit;

      const [{ total }] = await db
        .select({ total: count() })
        .from(posts)
        .where(whereCondition);

      const rows = await db.query.posts.findMany({
        where: whereCondition,
        orderBy: [desc(posts.publishedAt)],
        limit,
        offset,
        with: {
          category: true,
          author: { with: { avatar: true } },
          heroImage: true,
          tags: true,
        },
      });

      const totalDocs = total;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        docs: rows.map(mapPost),
        totalDocs,
        totalPages,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    },
    ["posts-by-author", String(tenantId), String(authorId), String(limit), String(page)],
    { revalidate: CACHE_TTL_EDITORIAL, tags: ["posts"] },
  )(tenantId);
}

export async function getAuthorBySlug(slug: string) {
  const tenantId = await getTenantId();
  return unstable_cache(
    async (tenantId: number) => {
      const row = await db.query.authors.findFirst({
        where: and(eq(authors.tenantId, tenantId), eq(authors.slug, slug)),
        with: { avatar: true },
      });
      if (!row) return null;
      return {
        ...row,
        avatar: row.avatar ? { url: row.avatar.url } : null,
      };
    },
    ["author-by-slug", String(tenantId), slug],
    { revalidate: CACHE_TTL_STABLE, tags: ["authors"] },
  )(tenantId);
}

const _getCategories = unstable_cache(
  async (tenantId: number) => {
    const rows = await db.query.categories.findMany({
      where: eq(categories.tenantId, tenantId),
      orderBy: [asc(categories.name)],
    });
    return { docs: rows };
  },
  ["categories"],
  { revalidate: CACHE_TTL_STABLE, tags: ["categories"] },
);

export async function getCategories() {
  const tenantId = await getTenantId();
  return _getCategories(tenantId);
}

const _getPageBySlug = unstable_cache(
  async (tenantId: number, slug: string) => {
    const [page] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug)))
      .limit(1);
    return page ?? null;
  },
  ["page-by-slug"],
  { revalidate: CACHE_TTL_EDITORIAL, tags: ["pages"] },
);

export async function getPageBySlug(slug: string) {
  const tenantId = await getTenantId();
  return _getPageBySlug(tenantId, slug);
}

const _getCategoriesWithCount = unstable_cache(
  async (tenantId: number) => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        postCount: count(posts.id),
      })
      .from(categories)
      .leftJoin(
        posts,
        and(eq(posts.categoryId, categories.id), eq(posts.status, "published"), eq(posts.tenantId, tenantId)),
      )
      .where(eq(categories.tenantId, tenantId))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    return rows;
  },
  ["categories-with-count"],
  { revalidate: CACHE_TTL_STABLE, tags: ["posts", "categories"] },
);

export async function getCategoriesWithCount() {
  const tenantId = await getTenantId();
  return _getCategoriesWithCount(tenantId);
}
