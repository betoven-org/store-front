import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages, pageVersions } from "@brasa/core/schema";
import { and, eq, count, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import { notifyFrontend } from "@brasa/core/revalidate";
import { logAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  const tenantId = await getTenantId();
  if (isNaN(numId))
    return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const [page] = await db.select().from(pages).where(and(eq(pages.id, numId), eq(pages.tenantId, tenantId))).limit(1);
  if (!page)
    return NextResponse.json({ error: "Pagina nao encontrada" }, { status: 404 });

  if (!page.draft && !page.draftSections)
    return NextResponse.json({ error: "Nenhum rascunho para publicar" }, { status: 400 });

  const draft = (page.draft as Record<string, unknown>) || {};

  const updateData: Record<string, unknown> = {
    draft: null,
    draftSections: null,
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

  // Save version before publishing
  const [versionCount] = await db
    .select({ value: count() })
    .from(pageVersions)
    .where(eq(pageVersions.pageId, numId));

  const nextVersion = (versionCount?.value ?? 0) + 1;

  // The version captures the NEW published state (what will be live after this publish)
  const versionTitle = (updateData.title as string) ?? page.title;
  const versionMetaTitle = (updateData.metaTitle as string) ?? page.metaTitle;
  const versionMetaDescription = (updateData.metaDescription as string) ?? page.metaDescription;
  const versionOgTitle = (updateData.ogTitle as string) ?? page.ogTitle;
  const versionOgDescription = (updateData.ogDescription as string) ?? page.ogDescription;
  const versionOgImageUrl = (updateData.ogImageUrl as string) ?? page.ogImageUrl;
  const versionContent = (updateData.content as string) ?? page.content;
  const versionSections = updateData.sections ?? page.sections;

  const updated = await db.transaction(async (tx) => {
    await tx.insert(pageVersions).values({
      pageId: numId,
      tenantId,
      version: nextVersion,
      title: versionTitle,
      metaTitle: versionMetaTitle,
      metaDescription: versionMetaDescription,
      ogTitle: versionOgTitle,
      ogDescription: versionOgDescription,
      ogImageUrl: versionOgImageUrl,
      content: versionContent,
      sections: versionSections,
      publishedBy: session.user.name || session.user.email || "Desconhecido",
    });

    const [row] = await tx
      .update(pages)
      .set(updateData)
      .where(and(eq(pages.id, numId), eq(pages.tenantId, tenantId)))
      .returning();

    return row;
  });

  // Invalidate cache so the site reflects changes immediately
  revalidateTag("pages");
  const pageSlug = updated?.slug === "home" ? "" : updated?.slug;
  notifyFrontend(tenantId, {
    paths: [`/${pageSlug || ""}`],
    tags: ["pages"],
  });

  logAction({
    tenantId,
    userId: (session.user as any).id,
    userName: session.user.name || session.user.email || "Desconhecido",
    action: "page.publish",
    resource: "pages",
    resourceId: numId,
    resourceTitle: updated?.title,
  });

  // Notify Slack on publish (best-effort, non-blocking)
  if (process.env.SLACK_WEBHOOK_URL) {
    const userName = session.user.name || session.user.email;
    fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `📄 ${userName} publicou a página "${updated?.title || "Sem título"}" no Brasa CMS` }),
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}
