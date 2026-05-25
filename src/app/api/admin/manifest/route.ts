import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/admin/manifest — Returns the manifest for the current tenant.
 * Used by the page builder to know which sections are available.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({ manifest: tenants.manifest })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.manifest) {
    // Fallback: return static manifest if no dynamic one is stored
    try {
      const staticManifest = await import("@/manifest.json");
      return NextResponse.json(staticManifest.default || staticManifest);
    } catch {
      return NextResponse.json({ sections: [] });
    }
  }

  return NextResponse.json(tenant.manifest);
}
