import { db } from "@brasa/core/db";
import { posts } from "@brasa/core/schema";
import { eq, and, desc } from "drizzle-orm";
import type { LoaderContext, LoaderResult } from "./types";

export async function loadPosts(
  props: Record<string, unknown>,
  ctx: LoaderContext,
): Promise<LoaderResult> {
  const limit = Number(props.limit) || 6;

  const rows = await db.query.posts.findMany({
    where: and(eq(posts.tenantId, ctx.tenantId), eq(posts.status, "published")),
    orderBy: [desc(posts.publishedAt)],
    limit,
    with: {
      category: true,
      author: { with: { avatar: true } },
      heroImage: true,
    },
  });

  return {
    data: rows,
    cacheTags: ["posts"],
  };
}
