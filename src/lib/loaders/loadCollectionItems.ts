import { db } from "@brasa/core/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import type { LoaderContext, LoaderResult } from "./types";

export async function loadCollectionItems(
  props: Record<string, unknown>,
  ctx: LoaderContext,
): Promise<LoaderResult> {
  const slug = String(props.collectionSlug || "");
  const limit = Number(props.limit) || 10;

  if (!slug) {
    return { data: [], cacheTags: ["collections"] };
  }

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.tenantId, ctx.tenantId), eq(collections.slug, slug)))
    .limit(1);

  if (!collection) {
    return { data: [], cacheTags: ["collections"] };
  }

  const items = await db
    .select()
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collection.id),
        eq(collectionItems.tenantId, ctx.tenantId),
        eq(collectionItems.status, "published"),
        isNull(collectionItems.deletedAt),
      ),
    )
    .orderBy(desc(collectionItems.publishedAt))
    .limit(limit);

  return {
    data: items,
    cacheTags: [`collection:${slug}`],
  };
}
