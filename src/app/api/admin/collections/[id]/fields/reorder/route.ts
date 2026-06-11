import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionFields } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function PUT(
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
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids deve ser um array de IDs" },
        { status: 400 }
      );
    }

    // Update each field's sortOrder based on its position in the array
    const updates = ids.map((fieldId: number, index: number) =>
      db
        .update(collectionFields)
        .set({ sortOrder: index })
        .where(
          and(
            eq(collectionFields.id, fieldId),
            eq(collectionFields.collectionId, collectionId)
          )
        )
    );

    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collection fields reorder error:", error);
    return NextResponse.json(
      { error: "Erro ao reordenar campos" },
      { status: 500 }
    );
  }
}
