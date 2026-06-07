import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      domain: tenants.domain,
      frontendUrl: tenants.frontendUrl,
      previewUrl: tenants.previewUrl,
      revalidateSecret: tenants.revalidateSecret,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant nao encontrado" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const body = await request.json();

  const allowedFields = ["frontendUrl", "previewUrl", "domain"] as const;
  const updates: Record<string, string | null> = {};

  for (const field of allowedFields) {
    if (field in body) {
      const val = body[field];
      updates[field] = typeof val === "string" && val.trim() ? val.trim().replace(/\/+$/, "") : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const [updated] = await db
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, tenantId))
    .returning({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      domain: tenants.domain,
      frontendUrl: tenants.frontendUrl,
      previewUrl: tenants.previewUrl,
      revalidateSecret: tenants.revalidateSecret,
    });

  return NextResponse.json(updated);
}
