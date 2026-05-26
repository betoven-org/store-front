import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";
import staticManifest from "@/manifest.json";

/**
 * GET /api/admin/manifest — Returns the manifest for the page builder.
 * Uses draft_manifest (includes dev sections) with fallback to manifest (prod),
 * then fallback to static manifest.json bundled in the app.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({ manifest: tenants.manifest, draftManifest: tenants.draftManifest })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  // Priority: draftManifest > manifest > static fallback
  const data = tenant?.draftManifest || tenant?.manifest || staticManifest;

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
