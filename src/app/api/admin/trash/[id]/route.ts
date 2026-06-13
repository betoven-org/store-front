import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";
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

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId), isNotNull(pages.deletedAt)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Pagina nao encontrada na lixeira" }, { status: 404 });

    await db
      .update(pages)
      .set({ deletedAt: null })
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)));

    revalidateTag("pages");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Trash restore error:", error);
    return NextResponse.json(
      { error: "Erro ao restaurar pagina" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId), isNotNull(pages.deletedAt)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Pagina nao encontrada na lixeira" }, { status: 404 });

    await db
      .delete(pages)
      .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)));

    revalidateTag("pages");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Trash permanent delete error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir pagina permanentemente" },
      { status: 500 },
    );
  }
}
