import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { parseBody, updatePageSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(pageId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [page] = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
      .limit(1);

    if (!page)
      return NextResponse.json({ error: "Pagina nao encontrada" }, { status: 404 });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Pages get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pagina" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(pageId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const body = await request.json();

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Pagina nao encontrada" }, { status: 404 });

    // If only draftSections is being saved (from PageBuilder)
    if (body.draftSections !== undefined && Object.keys(body).length === 1) {
      const [updated] = await db
        .update(pages)
        .set({ draftSections: body.draftSections, updatedAt: new Date().toISOString() })
        .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
        .returning();
      return NextResponse.json(updated);
    }

    // If only scheduledAt is being saved
    if (body.scheduledAt !== undefined && Object.keys(body).length === 1) {
      const scheduledAt = body.scheduledAt === null ? null : body.scheduledAt;
      const [updated] = await db
        .update(pages)
        .set({ scheduledAt, updatedAt: new Date().toISOString() })
        .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
        .returning();
      return NextResponse.json(updated);
    }

    const parsed = parseBody(updatePageSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const draftData = {
      title: parsed.data.title,
      metaTitle: parsed.data.metaTitle,
      metaDescription: parsed.data.metaDescription,
      ogTitle: parsed.data.ogTitle,
      ogDescription: parsed.data.ogDescription,
      ogImageUrl: parsed.data.ogImageUrl,
      content: parsed.data.content,
    };

    const [updated] = await db
      .update(pages)
      .set({ draft: draftData, updatedAt: new Date().toISOString() })
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Pages update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pagina" },
      { status: 500 },
    );
  }
}
