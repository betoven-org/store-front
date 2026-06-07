import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenantIntegrations } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/admin/integrations/config — List all integrations for this tenant
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await db
    .select()
    .from(tenantIntegrations)
    .where(eq(tenantIntegrations.tenantId, tenantId));

  // Return as map { integration: { config, enabled } }
  const map: Record<string, { enabled: boolean; config: Record<string, string> }> = {};
  for (const row of rows) {
    map[row.integration] = { enabled: row.enabled, config: row.config as Record<string, string> };
  }

  return NextResponse.json(map);
}

/**
 * POST /api/admin/integrations/config — Save/update integration config
 * Body: { integration: "slack", config: { webhookUrl: "..." }, enabled: true }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const { integration, config, enabled = true } = await req.json();

  if (!integration || !config) {
    return NextResponse.json({ error: "integration e config são obrigatórios" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Upsert
  const [existing] = await db
    .select({ id: tenantIntegrations.id })
    .from(tenantIntegrations)
    .where(and(eq(tenantIntegrations.tenantId, tenantId), eq(tenantIntegrations.integration, integration)))
    .limit(1);

  if (existing) {
    await db
      .update(tenantIntegrations)
      .set({ config, enabled, updatedAt: now })
      .where(eq(tenantIntegrations.id, existing.id));
  } else {
    await db.insert(tenantIntegrations).values({ tenantId, integration, config, enabled, createdAt: now, updatedAt: now });
  }

  return NextResponse.json({ success: true, integration, enabled });
}

/**
 * DELETE /api/admin/integrations/config — Remove integration
 * Body: { integration: "slack" }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const { integration } = await req.json();

  await db
    .delete(tenantIntegrations)
    .where(and(eq(tenantIntegrations.tenantId, tenantId), eq(tenantIntegrations.integration, integration)));

  return NextResponse.json({ success: true });
}
