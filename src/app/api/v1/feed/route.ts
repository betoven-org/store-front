import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { posts, categories, authors, siteSettings } from "@brasa/core/schema";
import { eq, desc, and } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const [settings, postRows] = await Promise.all([
    db.query.siteSettings.findFirst({
      where: eq(siteSettings.tenantId, tenantId),
    }),
    db.query.posts.findMany({
      where: and(eq(posts.tenantId, tenantId), eq(posts.status, "published")),
      orderBy: [desc(posts.publishedAt)],
      limit: 50,
      with: {
        category: true,
        author: true,
      },
    }),
  ]);

  return NextResponse.json({
    site: {
      title: settings?.siteName ?? null,
      description: settings?.siteDescription ?? null,
    },
    items: postRows.map((r) => ({
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
      category: r.category?.name ?? null,
      author: r.author?.name ?? null,
    })),
  });
});
