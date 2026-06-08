import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function POST(
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

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "action e ids sao obrigatorios" },
        { status: 400 }
      );
    }

    if (!["publish", "draft", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "action deve ser publish, draft ou delete" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const where = and(
      inArray(collectionItems.id, ids),
      eq(collectionItems.collectionId, collectionId),
      eq(collectionItems.tenantId, tenantId)
    )!;

    if (action === "publish") {
      await db
        .update(collectionItems)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(where);
    } else if (action === "draft") {
      await db
        .update(collectionItems)
        .set({ status: "draft", updatedAt: now })
        .where(where);
    } else if (action === "delete") {
      // Soft delete
      await db
        .update(collectionItems)
        .set({ deletedAt: now, updatedAt: now })
        .where(where);
    }

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    console.error("Collection items bulk action error:", error);
    return NextResponse.json(
      { error: "Erro na operacao em massa" },
      { status: 500 }
    );
  }
}
