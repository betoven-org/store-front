import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);

  if (!sub) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada" }, { status: 404 });
  }

  return NextResponse.json(sub);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const { status, nextDueDate, graceDays } = body;

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  if (!sub) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (status && ["active", "overdue", "suspended"].includes(status)) {
    updateData.status = status;
  }

  if (nextDueDate) {
    updateData.nextDueDate = nextDueDate;
  }

  if (typeof graceDays === "number" && graceDays >= 0) {
    updateData.graceDays = graceDays;
  }

  const [updated] = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, sub.id))
    .returning();

  return NextResponse.json(updated);
}
