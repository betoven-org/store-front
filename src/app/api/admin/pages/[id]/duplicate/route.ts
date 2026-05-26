import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq, like } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(pageId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [original] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
      .limit(1);

    if (!original)
      return NextResponse.json({ error: "Pagina nao encontrada" }, { status: 404 });

    // Generate unique slug
    const baseSlug = `${original.slug}-copia`;
    const existing = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(and(eq(pages.tenantId, tenantId), like(pages.slug, `${baseSlug}%`)));

    const existingSlugs = new Set(existing.map((p) => p.slug));
    let finalSlug = baseSlug;
    if (existingSlugs.has(finalSlug)) {
      let counter = 2;
      while (existingSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      finalSlug = `${baseSlug}-${counter}`;
    }

    const now = new Date().toISOString();
    const [created] = await db
      .insert(pages)
      .values({
        tenantId,
        title: `${original.title} (copia)`,
        slug: finalSlug,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        ogTitle: original.ogTitle,
        ogDescription: original.ogDescription,
        ogImageUrl: original.ogImageUrl,
        content: original.content,
        sections: original.sections,
        draft: null,
        draftSections: null,
        scheduledAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Page duplicate error:", error);
    return NextResponse.json(
      { error: "Erro ao duplicar pagina" },
      { status: 500 },
    );
  }
}
