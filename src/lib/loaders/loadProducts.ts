import { db } from "@brasa/core/db";
import { products } from "@brasa/core/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LoaderContext, LoaderResult } from "./types";

export async function loadProducts(
  props: Record<string, unknown>,
  ctx: LoaderContext,
): Promise<LoaderResult> {
  const limit = Number(props.limit) || 6;

  const rows = await db.query.products.findMany({
    where: and(
      eq(products.tenantId, ctx.tenantId),
      eq(products.status, "published"),
    ),
    orderBy: [desc(products.publishedAt)],
    limit,
    with: {
      image: true,
      category: true,
    },
  });

  return {
    data: rows,
    cacheTags: ["products"],
  };
}
