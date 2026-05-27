import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { products, media } from "@brasa/core/schema";
import { eq, and, inArray } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }, _req, params) => {
  const { slug } = params;

  const row = await db.query.products.findFirst({
    where: and(
      eq(products.tenantId, tenantId),
      eq(products.slug, slug),
      eq(products.status, "published"),
    ),
    with: {
      category: true,
      image: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Resolve gallery images
  let gallery: { id: number; url: string; alt: string }[] = [];
  const galleryIds = row.galleryImages as number[] | null;
  if (galleryIds && galleryIds.length > 0) {
    const images = await db
      .select({ id: media.id, url: media.url, alt: media.alt })
      .from(media)
      .where(inArray(media.id, galleryIds));
    gallery = galleryIds
      .map((gid) => images.find((img) => img.id === gid))
      .filter(Boolean) as typeof gallery;
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    content: row.content,
    composition: row.composition,
    usageInstructions: row.usageInstructions,
    whoCanUse: row.whoCanUse,
    benefits: row.benefits,
    differentials: row.differentials,
    faq: row.faq,
    brand: row.brand,
    isKit: row.isKit,
    featured: row.featured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    publishedAt: row.publishedAt,
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    image: row.image
      ? { url: row.image.url, alt: row.image.alt, cardUrl: row.image.cardUrl, heroUrl: row.image.heroUrl }
      : null,
    gallery,
  });
});
