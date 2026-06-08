import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id, iid } = await params;
    const collectionId = Number(id);
    const itemId = Number(iid);
    const tenantId = await getTenantId();

    if (isNaN(collectionId) || isNaN(itemId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const [item] = await db
      .select()
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId),
          isNull(collectionItems.deletedAt)
        )
      )
      .limit(1);

    if (!item)
      return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Collection item get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar item" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id, iid } = await params;
    const collectionId = Number(id);
    const itemId = Number(iid);
    const tenantId = await getTenantId();

    if (isNaN(collectionId) || isNaN(itemId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const [existing] = await db
      .select({ id: collectionItems.id, status: collectionItems.status })
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId),
          isNull(collectionItems.deletedAt)
        )
      )
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });

    const body = await request.json();
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (body.slug !== undefined) {
      updates.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (body.data !== undefined) updates.data = body.data;
    if (body.featured !== undefined) updates.featured = body.featured;
    if (body.status !== undefined) {
      updates.status = body.status;
      // Set publishedAt when transitioning to published
      if (body.status === "published" && existing.status !== "published") {
        updates.publishedAt = now;
      }
    }

    const [updated] = await db
      .update(collectionItems)
      .set(updates)
      .where(
        and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId)
        )
      )
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
        { error: "Ja existe um item com esse slug nesta colecao" },
        { status: 409 }
      );
    }
    console.error("Collection item update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id, iid } = await params;
    const collectionId = Number(id);
    const itemId = Number(iid);
    const tenantId = await getTenantId();

    if (isNaN(collectionId) || isNaN(itemId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const [existing] = await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId),
          isNull(collectionItems.deletedAt)
        )
      )
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });

    // Soft delete
    await db
      .update(collectionItems)
      .set({ deletedAt: new Date().toISOString() })
      .where(
        and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collection item soft-delete error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir item" },
      { status: 500 }
    );
  }
}
