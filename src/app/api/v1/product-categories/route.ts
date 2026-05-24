import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { productCategories } from "@brasa/core/schema";
import { eq, asc } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const rows = await db.query.productCategories.findMany({
    where: eq(productCategories.tenantId, tenantId),
    orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
    with: { image: true },
  });

  return NextResponse.json({
    docs: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      image: r.image
        ? { url: r.image.url, alt: r.image.alt, thumbnailUrl: r.image.thumbnailUrl }
        : null,
    })),
  });
});
