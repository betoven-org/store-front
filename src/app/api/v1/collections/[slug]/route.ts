import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@/db";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { eq, and, desc, asc, ilike, isNull, count, sql } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId, draft }, req, params) => {
  const { slug } = params;
  const { searchParams } = req.nextUrl;

  // Find collection by slug + tenant
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.tenantId, tenantId), eq(collections.slug, slug)),
    with: { fields: { orderBy: [asc(collectionFields.sortOrder)] } },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Parse query params
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));
  const status = searchParams.get("status") || "published";
  const search = searchParams.get("search");
  const sortParam = searchParams.get("sort"); // e.g. "createdAt" or "-createdAt"
  const featured = searchParams.get("featured");

  // Build conditions
  const conditions: any[] = [
    eq(collectionItems.tenantId, tenantId),
    eq(collectionItems.collectionId, collection.id),
    isNull(collectionItems.deletedAt),
  ];

  if (!draft) {
    conditions.push(eq(collectionItems.status, status as "draft" | "published"));
  } else if (status) {
    conditions.push(eq(collectionItems.status, status as "draft" | "published"));
  }

  if (featured === "true") {
    conditions.push(eq(collectionItems.featured, true));
  } else if (featured === "false") {
    conditions.push(eq(collectionItems.featured, false));
  }

  if (search) {
    conditions.push(ilike(collectionItems.slug, `%${search}%`));
  }

  const whereClause = and(...conditions);

  // Sort
  let orderBy: any[];
  if (sortParam) {
    const descending = sortParam.startsWith("-");
    const field = descending ? sortParam.slice(1) : sortParam;
    const col = field === "createdAt"
      ? collectionItems.createdAt
      : field === "updatedAt"
        ? collectionItems.updatedAt
        : field === "publishedAt"
          ? collectionItems.publishedAt
          : field === "slug"
            ? collectionItems.slug
            : collectionItems.createdAt;
    orderBy = descending ? [desc(col)] : [asc(col)];
  } else {
    orderBy = [desc(collectionItems.createdAt)];
  }

  // Count total
  const [{ total }] = await db
    .select({ total: count() })
    .from(collectionItems)
    .where(whereClause);

  // Fetch items
  const items = await db.query.collectionItems.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset,
  });

  const docs = items.map((item) => ({
    id: item.id,
    slug: item.slug,
    status: item.status,
    featured: item.featured,
    data: item.data,
    externalId: item.externalId,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return NextResponse.json({
    docs,
    total: Number(total),
    limit,
    offset,
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
