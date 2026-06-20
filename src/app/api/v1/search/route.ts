import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories } from "@brasa/core/schema";
import { eq, desc, and, ilike, or, count } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

export const GET = withApiKey(async ({ tenantId }, req) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "12")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const categorySlug = searchParams.get("category");
  const offset = (page - 1) * limit;

  if (!q) {
    return NextResponse.json({ docs: [], totalDocs: 0, totalPages: 0, page });
  }

  if (isNeonDown()) {
    const fb = await searchFallback(tenantId, q, { limit, page, offset });
    if (fb) return fb;
  }

  try {
    const searchPattern = `%${q}%`;
    const conditions = [
      eq(posts.tenantId, tenantId),
      eq(posts.status, "published"),
      or(ilike(posts.title, searchPattern), ilike(posts.excerpt, searchPattern))!,
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
      },
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      docs: rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        coverUrl: r.coverUrl,
        publishedAt: r.publishedAt,
        readingTimeMinutes: r.readingTimeMinutes,
        category: r.category,
        author: r.author ? { name: r.author.name, slug: r.author.slug } : null,
        heroImage: r.heroImage ? { url: r.heroImage.url, alt: r.heroImage.alt } : null,
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
    const fb = await searchFallback(tenantId, q, { limit, page, offset });
    if (fb) return fb;
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

async function searchFallback(
  tenantId: number,
  q: string,
  opts: { limit: number; page: number; offset: number },
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "posts");
  if (!config) return null;

  const result = await querySupabase(config.supabaseTable, {
    filters: { status: "eq.published" },
    or: `(title.ilike.%${q}%,excerpt.ilike.%${q}%)`,
    order: "created_at.desc",
    limit: opts.limit,
    offset: opts.offset,
  });

  if (!result) return null;

  const docs = result.data.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverUrl: row.cover_image_url,
    publishedAt: row.published_at || row.published_date || row.created_at,
    readingTimeMinutes: row.reading_time_minutes,
    category: null,
    author: row.author_name ? { name: row.author_name, slug: null } : null,
    heroImage: row.cover_image_url ? { url: row.cover_image_url, alt: row.title } : null,
  }));

  const totalDocs = result.count;
  const totalPages = Math.ceil(totalDocs / opts.limit);

  return NextResponse.json({
    docs,
    totalDocs,
    totalPages,
    page: opts.page,
    hasNextPage: opts.page < totalPages,
    hasPrevPage: opts.page > 1,
    _fallback: "supabase",
  });
}
