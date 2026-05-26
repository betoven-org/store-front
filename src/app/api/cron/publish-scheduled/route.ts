import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { pages, pageVersions } from "@brasa/core/schema";
import { and, lte, isNotNull, isNull, eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretParam = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    secretParam !== cronSecret
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find all pages with scheduled_at <= NOW
  const scheduledPages = await db
    .select()
    .from(pages)
    .where(and(isNotNull(pages.scheduledAt), isNull(pages.deletedAt), lte(pages.scheduledAt, now)));

  let publishedCount = 0;

  for (const page of scheduledPages) {
    // Only publish if there's actually a draft or draftSections
    if (!page.draft && !page.draftSections) {
      // No draft to publish — just clear the schedule
      await db
        .update(pages)
        .set({ scheduledAt: null, updatedAt: new Date().toISOString() })
        .where(eq(pages.id, page.id));
      continue;
    }

    const draft = (page.draft as Record<string, unknown>) || {};

    const updateData: Record<string, unknown> = {
      draft: null,
      draftSections: null,
      scheduledAt: null,
      updatedAt: new Date().toISOString(),
    };

    // Publish content draft
    if (page.draft) {
      updateData.title = (draft.title as string) ?? page.title;
      updateData.metaTitle = (draft.metaTitle as string) ?? page.metaTitle;
      updateData.metaDescription = (draft.metaDescription as string) ?? page.metaDescription;
      updateData.ogTitle = (draft.ogTitle as string) ?? page.ogTitle;
      updateData.ogDescription = (draft.ogDescription as string) ?? page.ogDescription;
      updateData.ogImageUrl = (draft.ogImageUrl as string) ?? page.ogImageUrl;
      updateData.content = (draft.content as string) ?? page.content;
    }

    // Publish sections draft
    if (page.draftSections) {
      updateData.sections = page.draftSections;
    }

    // Save version
    const [versionCount] = await db
      .select({ value: count() })
      .from(pageVersions)
      .where(eq(pageVersions.pageId, page.id));

    const nextVersion = (versionCount?.value ?? 0) + 1;

    const versionTitle = (updateData.title as string) ?? page.title;
    const versionMetaTitle = (updateData.metaTitle as string) ?? page.metaTitle;
    const versionMetaDescription = (updateData.metaDescription as string) ?? page.metaDescription;
    const versionOgTitle = (updateData.ogTitle as string) ?? page.ogTitle;
    const versionOgDescription = (updateData.ogDescription as string) ?? page.ogDescription;
    const versionOgImageUrl = (updateData.ogImageUrl as string) ?? page.ogImageUrl;
    const versionContent = (updateData.content as string) ?? page.content;
    const versionSections = updateData.sections ?? page.sections;

    await db.insert(pageVersions).values({
      pageId: page.id,
      tenantId: page.tenantId,
      version: nextVersion,
      title: versionTitle,
      metaTitle: versionMetaTitle,
      metaDescription: versionMetaDescription,
      ogTitle: versionOgTitle,
      ogDescription: versionOgDescription,
      ogImageUrl: versionOgImageUrl,
      content: versionContent,
      sections: versionSections,
      publishedBy: "Sistema (agendamento)",
    });

    await db.update(pages).set(updateData).where(eq(pages.id, page.id));
    publishedCount++;
  }

  return NextResponse.json({
    ok: true,
    published: publishedCount,
    checked: scheduledPages.length,
  });
}
