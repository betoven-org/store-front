import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { products } from "@brasa/core/schema";
import { eq, desc, and } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }, req) => {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));
  const categoryId = searchParams.get("category");

  const conditions = [
    eq(products.tenantId, tenantId),
    eq(products.status, "published"),
    eq(products.showOnSite, true),
  ];

  if (categoryId) {
    conditions.push(eq(products.productCategoryId, Number(categoryId)));
  }

  const rows = await db.query.products.findMany({
    where: and(...conditions),
    orderBy: [desc(products.publishedAt)],
    limit,
    offset,
    with: {
      category: true,
      image: true,
    },
  });

  return NextResponse.json({
    docs: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      brand: r.brand,
      isKit: r.isKit,
      featured: r.featured,
      publishedAt: r.publishedAt,
      category: r.category
        ? { id: r.category.id, name: r.category.name, slug: r.category.slug }
        : null,
      image: r.image
        ? { url: r.image.url, alt: r.image.alt, thumbnailUrl: r.image.thumbnailUrl }
        : null,
    })),
  });
});
