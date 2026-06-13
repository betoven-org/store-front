import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionFields } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id, fid } = await params;
    const collectionId = Number(id);
    const fieldId = Number(fid);
    const tenantId = await getTenantId();

    if (isNaN(collectionId) || isNaN(fieldId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id, slug: collections.slug })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    // Verify field belongs to collection
    const [existing] = await db
      .select({ id: collectionFields.id })
      .from(collectionFields)
      .where(and(eq(collectionFields.id, fieldId), eq(collectionFields.collectionId, collectionId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Campo nao encontrado" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.type !== undefined) updates.type = body.type;
    if (body.required !== undefined) updates.required = body.required;
    if (body.config !== undefined) updates.config = body.config;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const [updated] = await db
      .update(collectionFields)
      .set(updates)
      .where(and(eq(collectionFields.id, fieldId), eq(collectionFields.collectionId, collectionId)))
      .returning();

    revalidateTag(`collection:${collection.slug}`);

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Ja existe um campo com esse slug nesta colecao" },
        { status: 409 }
      );
    }
    console.error("Collection field update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar campo" },
      { status: 500 }
    );
  }
}

// Aceita PATCH com a mesma semantica de update parcial
export { PUT as PATCH };

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id, fid } = await params;
    const collectionId = Number(id);
    const fieldId = Number(fid);
    const tenantId = await getTenantId();

    if (isNaN(collectionId) || isNaN(fieldId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id, slug: collections.slug })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const [existing] = await db
      .select({ id: collectionFields.id })
      .from(collectionFields)
      .where(and(eq(collectionFields.id, fieldId), eq(collectionFields.collectionId, collectionId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Campo nao encontrado" }, { status: 404 });

    // Hard delete do campo. Os valores correspondentes em collection_items.data
    // ficam orfaos (nao sao limpos dos itens) — comportamento aceito.
    await db
      .delete(collectionFields)
      .where(and(eq(collectionFields.id, fieldId), eq(collectionFields.collectionId, collectionId)));

    revalidateTag(`collection:${collection.slug}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collection field delete error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir campo" },
      { status: 500 }
    );
  }
}
