import { db } from "@brasa/core/db";
import { categories } from "@brasa/core/schema";
import { eq, asc } from "drizzle-orm";
import type { LoaderContext, LoaderResult } from "./types";

export async function loadCategories(
  _props: Record<string, unknown>,
  ctx: LoaderContext,
): Promise<LoaderResult> {
  const rows = await db.query.categories.findMany({
    where: eq(categories.tenantId, ctx.tenantId),
    orderBy: [asc(categories.name)],
  });

  return {
    data: rows,
    cacheTags: ["categories"],
  };
}
