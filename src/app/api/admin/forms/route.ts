import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { forms, formSubmissions } from "@brasa/core/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await db
    .select()
    .from(forms)
    .where(eq(forms.tenantId, tenantId))
    .orderBy(desc(forms.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, slug, fields: formFields, successMessage, notifyEmail } = body;

  if (!name || !slug || !formFields) {
    return NextResponse.json({ error: "name, slug e fields são obrigatórios" }, { status: 400 });
  }

  const [row] = await db
    .insert(forms)
    .values({ tenantId, name, slug, fields: formFields, successMessage, notifyEmail })
    .returning();

  revalidateTag("forms");

  return NextResponse.json(row, { status: 201 });
}
