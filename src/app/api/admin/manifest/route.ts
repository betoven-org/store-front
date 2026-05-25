import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/admin/manifest — Returns the manifest for the page builder.
 * Uses draft_manifest (includes dev sections) with fallback to manifest (prod).
 * This way the page builder always shows the latest sections (including unreleased).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({ manifest: tenants.manifest, draftManifest: tenants.draftManifest })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  // Priority: draftManifest > manifest > static fallback
  const data = tenant?.draftManifest || tenant?.manifest;

  if (data) {
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  }

  // Fallback: static manifest.json
  try {
    const staticManifest = await import("@/manifest.json");
    return NextResponse.json(staticManifest.default || staticManifest);
  } catch {
    return NextResponse.json({ sections: [] });
  }
}
