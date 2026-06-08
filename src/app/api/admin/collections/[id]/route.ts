import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [collection] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const fields = await db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(asc(collectionFields.sortOrder));

    return NextResponse.json({ ...collection, fields });
  } catch (error) {
    console.error("Collection get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colecao" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) {
      updates.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.source !== undefined) updates.source = body.source;
    if (body.syncConfig !== undefined) updates.syncConfig = body.syncConfig;
    if (body.pageSlugPattern !== undefined) updates.pageSlugPattern = body.pageSlugPattern;
    if (body.pageSections !== undefined) updates.pageSections = body.pageSections;
    if (body.pageDraftSections !== undefined) updates.pageDraftSections = body.pageDraftSections;

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Ja existe uma colecao com esse slug" },
        { status: 409 }
      );
    }
    console.error("Collection update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar colecao" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    // cascade delete handles fields and items via FK onDelete: "cascade"
    await db
      .delete(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collection delete error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir colecao" },
      { status: 500 }
    );
  }
}
