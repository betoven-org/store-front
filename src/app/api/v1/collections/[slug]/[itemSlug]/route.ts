import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug, itemSlug } = params;

  // Find collection by slug + tenant
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.tenantId, tenantId), eq(collections.slug, slug)),
    with: { fields: { orderBy: [asc(collectionFields.sortOrder)] } },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Find item by slug within collection
  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.tenantId, tenantId),
      eq(collectionItems.collectionId, collection.id),
      eq(collectionItems.slug, itemSlug),
      isNull(collectionItems.deletedAt),
    ),
  });

  if (!item || (!draft && item.status !== "published")) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: item.id,
    slug: item.slug,
    status: item.status,
    featured: item.featured,
    data: item.data,
    externalId: item.externalId,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    collection: {
      name: collection.name,
      slug: collection.slug,
      fields: collection.fields.map((f) => ({
        slug: f.slug,
        name: f.name,
        type: f.type,
        required: f.required,
        config: f.config,
      })),
    },
  });
});
