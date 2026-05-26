import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { cmsGuides } from "@brasa/core/schema";
import { asc, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const guides = await db
    .select()
    .from(cmsGuides)
    .where(eq(cmsGuides.tenantId, tenantId))
    .orderBy(asc(cmsGuides.sortOrder));

  return NextResponse.json(guides);
}
