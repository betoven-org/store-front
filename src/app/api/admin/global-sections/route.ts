import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({ globalSections: tenants.globalSections })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant nao encontrado" }, { status: 404 });
  }

  return NextResponse.json(tenant.globalSections ?? { header: null, footer: null });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const body = await request.json();

  // Validate structure
  const globalSections: Record<string, any> = {};

  if ("header" in body) {
    if (body.header === null) {
      globalSections.header = null;
    } else {
      globalSections.header = {
        id: body.header.id ?? "global-header",
        component: "Header",
        props: body.header.props ?? body.header,
      };
    }
  }

  if ("footer" in body) {
    if (body.footer === null) {
      globalSections.footer = null;
    } else {
      globalSections.footer = {
        id: body.footer.id ?? "global-footer",
        component: "Footer",
        props: body.footer.props ?? body.footer,
      };
    }
  }

  // Merge with existing
  const [existing] = await db
    .select({ globalSections: tenants.globalSections })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const current = (existing?.globalSections as Record<string, any>) ?? {};
  const merged = { ...current, ...globalSections };

  const [updated] = await db
    .update(tenants)
    .set({ globalSections: merged })
    .where(eq(tenants.id, tenantId))
    .returning({ globalSections: tenants.globalSections });

  return NextResponse.json(updated.globalSections);
}
