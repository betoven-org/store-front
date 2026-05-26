import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages, pageVersions } from "@brasa/core/schema";
import { and, eq, count } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, versionId } = await params;
  const tenantId = await getTenantId();
  const numPageId = parseInt(id, 10);
  const numVersionId = parseInt(versionId, 10);

  if (isNaN(numPageId) || isNaN(numVersionId))
    return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const [version] = await db
    .select()
    .from(pageVersions)
    .where(
      and(
        eq(pageVersions.id, numVersionId),
        eq(pageVersions.pageId, numPageId),
        eq(pageVersions.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!version)
    return NextResponse.json({ error: "Versao nao encontrada" }, { status: 404 });

  return NextResponse.json(version);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, versionId } = await params;
  const tenantId = await getTenantId();
  const numPageId = parseInt(id, 10);
  const numVersionId = parseInt(versionId, 10);

  if (isNaN(numPageId) || isNaN(numVersionId))
    return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  // Find the version to rollback to
  const [version] = await db
    .select()
    .from(pageVersions)
    .where(
      and(
        eq(pageVersions.id, numVersionId),
        eq(pageVersions.pageId, numPageId),
        eq(pageVersions.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!version)
    return NextResponse.json({ error: "Versao nao encontrada" }, { status: 404 });

  // Copy version fields back to the page
  await db
    .update(pages)
    .set({
      title: version.title || "",
      metaTitle: version.metaTitle,
      metaDescription: version.metaDescription,
      ogTitle: version.ogTitle,
      ogDescription: version.ogDescription,
      ogImageUrl: version.ogImageUrl,
      content: version.content,
      sections: version.sections,
      draft: null,
      draftSections: null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(pages.id, numPageId), eq(pages.tenantId, tenantId)));

  // Save the rollback as a new version
  const [versionCount] = await db
    .select({ value: count() })
    .from(pageVersions)
    .where(eq(pageVersions.pageId, numPageId));

  const nextVersion = (versionCount?.value ?? 0) + 1;

  await db.insert(pageVersions).values({
    pageId: numPageId,
    tenantId,
    version: nextVersion,
    title: version.title,
    metaTitle: version.metaTitle,
    metaDescription: version.metaDescription,
    ogTitle: version.ogTitle,
    ogDescription: version.ogDescription,
    ogImageUrl: version.ogImageUrl,
    content: version.content,
    sections: version.sections,
    publishedBy: `${session.user.name || session.user.email || "Desconhecido"} (rollback v${version.version})`,
  });

  // Return the updated page
  const [updated] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, numPageId), eq(pages.tenantId, tenantId)))
    .limit(1);

  return NextResponse.json(updated);
}
