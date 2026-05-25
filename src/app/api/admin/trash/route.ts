import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { desc, eq, and, isNotNull } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const tenantId = await getTenantId();

    const docs = await db
      .select({
        id: pages.id,
        slug: pages.slug,
        title: pages.title,
        deletedAt: pages.deletedAt,
      })
      .from(pages)
      .where(and(eq(pages.tenantId, tenantId), isNotNull(pages.deletedAt)))
      .orderBy(desc(pages.deletedAt));

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Trash list error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar lixeira" },
      { status: 500 },
    );
  }
}
