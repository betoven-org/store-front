import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { redirects } from "@brasa/core/schema";
import { and, eq, desc } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await db
    .select()
    .from(redirects)
    .where(eq(redirects.tenantId, tenantId))
    .orderBy(desc(redirects.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const { from, to, type = 301 } = body;

  if (!from || !to) {
    return NextResponse.json({ error: "from e to são obrigatórios" }, { status: 400 });
  }

  const [row] = await db
    .insert(redirects)
    .values({ tenantId, from, to, type })
    .returning();

  revalidateTag("redirects");

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const { id } = await req.json();

  await db
    .delete(redirects)
    .where(and(eq(redirects.id, id), eq(redirects.tenantId, tenantId)));

  revalidateTag("redirects");

  return NextResponse.json({ deleted: true });
}
