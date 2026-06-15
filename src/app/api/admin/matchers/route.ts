import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db as appDb } from "@/db";
import { matchers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await appDb
    .select()
    .from(matchers)
    .where(eq(matchers.tenantId, tenantId))
    .orderBy(desc(matchers.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, type, config } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name e type sao obrigatorios" }, { status: 400 });
  }

  const [row] = await appDb
    .insert(matchers)
    .values({ tenantId, name, type, config: config || {} })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const { id } = await req.json();

  await appDb
    .delete(matchers)
    .where(and(eq(matchers.id, id), eq(matchers.tenantId, tenantId)));

  return NextResponse.json({ deleted: true });
}
