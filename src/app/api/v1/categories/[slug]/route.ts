import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories, authors, media } from "@brasa/core/schema";
import { eq, desc, and, count } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

export const GET = withApiKey(async ({ tenantId }, req, params) => {
  const { slug } = params;
  const { searchParams } = req.nextUrl;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "12")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const offset = (page - 1) * limit;

  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await categoryBySlugFromSupabase(tenantId, slug, { limit, page, offset });
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.tenantId, tenantId), eq(categories.slug, slug)),
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const whereCondition = and(
      eq(posts.tenantId, tenantId),
      eq(posts.status, "published"),
      eq(posts.categoryId, category.id),
    );

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

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      category,
      docs: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        coverUrl: r.coverUrl,
        publishedAt: r.publishedAt,
        readingTimeMinutes: r.readingTimeMinutes,
        category: r.category,
        author: r.author
          ? { id: r.author.id, name: r.author.name, slug: r.author.slug }
          : null,
        heroImage: r.heroImage
          ? { url: r.heroImage.url, alt: r.heroImage.alt }
          : null,
      })),
      totalDocs: total,
      totalPages,
      page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

async function categoryBySlugFromSupabase(
  tenantId: number,
  slug: string,
  opts: { limit: number; page: number; offset: number },
): Promise<NextResponse | null> {
  // Get category info from Supabase
  const catConfig = getCachedSyncConfig(tenantId, "categorias");
  if (!catConfig) return null;

  const catResult = await querySupabase(catConfig.supabaseTable, {
    filters: { slug: `eq.${slug}` },
    limit: 1,
  });
  if (!catResult || catResult.data.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const category = catResult.data[0] as Record<string, any>;

  // Get posts for this category
  const postsConfig = getCachedSyncConfig(tenantId, "posts");
  if (!postsConfig) {
    return NextResponse.json({
      category: { id: category.id, name: category.name, slug: category.slug },
      docs: [],
      totalDocs: 0,
      totalPages: 0,
      page: opts.page,
      hasNextPage: false,
      hasPrevPage: false,
      _fallback: "supabase",
    });
  }

  const postsResult = await querySupabase(postsConfig.supabaseTable, {
    filters: { status: "eq.published", category_id: `eq.${category.id}` },
    order: "created_at.desc",
    limit: opts.limit,
    offset: opts.offset,
  });

  const docs = (postsResult?.data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverUrl: row.cover_image_url,
    publishedAt: row.published_at || row.published_date || row.created_at,
    readingTimeMinutes: row.reading_time_minutes,
    category: { id: category.id, name: category.name, slug: category.slug },
    author: row.author_name ? { id: null, name: row.author_name, slug: null } : null,
    heroImage: row.cover_image_url ? { url: row.cover_image_url, alt: row.cover_image_alt || row.title } : null,
  }));

  const totalDocs = postsResult?.count ?? docs.length;
  const totalPages = Math.ceil(totalDocs / opts.limit);

  return NextResponse.json({
    category: { id: category.id, name: category.name, slug: category.slug },
    docs,
    totalDocs,
    totalPages,
    page: opts.page,
    hasNextPage: opts.page < totalPages,
    hasPrevPage: opts.page > 1,
    _fallback: "supabase",
  });
}
