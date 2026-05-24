import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories } from "@brasa/core/schema";
import { eq, desc, and, ilike, or, count } from "drizzle-orm";

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
});
