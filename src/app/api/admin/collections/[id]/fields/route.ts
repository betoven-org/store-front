import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionFields } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id, slug: collections.slug })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();
    const { slug, name, type, required, config, sortOrder } = body;

    if (!slug || !name || !type) {
      return NextResponse.json(
        { error: "slug, name e type sao obrigatorios" },
        { status: 400 }
      );
    }

    // Auto-assign sortOrder if not provided (put at end)
    let order = sortOrder;
    if (order === undefined || order === null) {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(${collectionFields.sortOrder}), -1)` })
        .from(collectionFields)
        .where(eq(collectionFields.collectionId, collectionId));
      order = (maxRow?.max ?? -1) + 1;
    }

    const [created] = await db
      .insert(collectionFields)
      .values({
        collectionId,
        slug,
        name,
        type,
        required: required ?? false,
        config: config || null,
        sortOrder: order,
        createdAt: new Date().toISOString(),
      })
      .returning();

    revalidateTag(`collection:${collection.slug}`);

    return NextResponse.json(created, { status: 201 });
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
    console.error("Collection field create error:", error);
    return NextResponse.json(
      { error: "Erro ao criar campo" },
      { status: 500 }
    );
  }
}
