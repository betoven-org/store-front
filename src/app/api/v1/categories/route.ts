import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { categories, posts } from "@brasa/core/schema";
import { eq, and, asc, count } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id),
    })
    .from(categories)
    .leftJoin(
      posts,
      and(
        eq(posts.categoryId, categories.id),
        eq(posts.status, "published"),
        eq(posts.tenantId, tenantId),
      ),
    )
    .where(eq(categories.tenantId, tenantId))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return NextResponse.json({ docs: rows });
});
