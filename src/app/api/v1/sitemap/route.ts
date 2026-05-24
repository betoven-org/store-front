import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, products, categories, pages } from "@brasa/core/schema";
import { eq, and, desc } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const [postRows, productRows, categoryRows, pageRows] = await Promise.all([
    db
      .select({
        slug: posts.slug,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(and(eq(posts.tenantId, tenantId), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt)),

    db
      .select({
        slug: products.slug,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.status, "published"),
          eq(products.showOnSite, true),
        ),
      ),

    db
      .select({
        slug: categories.slug,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .where(eq(categories.tenantId, tenantId)),

    db
      .select({
        slug: pages.slug,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.tenantId, tenantId)),
  ]);

  return NextResponse.json({
    posts: postRows,
    products: productRows,
    categories: categoryRows,
    pages: pageRows,
  });
});
