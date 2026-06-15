/**
 * Workflow definitions for Inngest.
 * Durable, retriable, observable background jobs.
 */

import { inngest } from "./inngest";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { eq, and, lte, isNotNull, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";

/**
 * Bulk Publish — publishes multiple pages in sequence with validation.
 * Triggered by sending event "pages/bulk-publish".
 */
export const bulkPublish = inngest.createFunction(
  {
    id: "bulk-publish-pages",
    name: "Publicar paginas em lote",
    retries: 2,
    triggers: [{ event: "pages/bulk-publish" }],
  },
  async ({ event }: { event: { data: { pageIds: number[]; tenantId: number } } }) => {
    const { pageIds, tenantId } = event.data;
    const now = new Date().toISOString();
    const results: { id: number; status: string }[] = [];

    for (const pageId of pageIds) {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
        .limit(1);

      if (!page) { results.push({ id: pageId, status: "not_found" }); continue; }
      if (!page.draftSections) { results.push({ id: pageId, status: "no_draft" }); continue; }

      await db
        .update(pages)
        .set({ sections: page.draftSections, draftSections: null, updatedAt: now })
        .where(eq(pages.id, pageId));

      results.push({ id: pageId, status: "published" });
    }

    revalidateTag("pages");

    return {
      total: pageIds.length,
      published: results.filter((r) => r.status === "published").length,
      results,
    };
  }
);

/**
 * Scheduled Pages Publish — checks for pages with scheduledAt in the past.
 */
export const scheduledPagePublish = inngest.createFunction(
  {
    id: "scheduled-page-publish",
    name: "Publicar paginas agendadas",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async () => {
    const now = new Date().toISOString();

    const scheduled = await db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(
        and(
          isNotNull(pages.scheduledAt),
          lte(pages.scheduledAt, now),
          isNotNull(pages.draftSections),
          isNull(pages.deletedAt)
        )
      );

    if (scheduled.length === 0) return { published: 0 };

    for (const page of scheduled) {
      const [full] = await db.select().from(pages).where(eq(pages.id, page.id)).limit(1);
      if (!full?.draftSections) continue;

      await db
        .update(pages)
        .set({ sections: full.draftSections, draftSections: null, scheduledAt: null, updatedAt: now })
        .where(eq(pages.id, page.id));
    }

    revalidateTag("pages");
    return { published: scheduled.length, pages: scheduled.map((p: { title: string | null }) => p.title) };
  }
);

/**
 * Trash Cleanup — permanently deletes items older than 30 days.
 */
export const trashCleanup = inngest.createFunction(
  {
    id: "trash-cleanup",
    name: "Limpar lixeira (30 dias)",
    triggers: [{ cron: "0 3 * * *" }],
  },
  async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const old = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(isNotNull(pages.deletedAt), lte(pages.deletedAt, thirtyDaysAgo)));

    for (const page of old) {
      await db.delete(pages).where(eq(pages.id, page.id));
    }

    return { deletedPages: old.length };
  }
);

export const workflowFunctions = [bulkPublish, scheduledPagePublish, trashCleanup];
