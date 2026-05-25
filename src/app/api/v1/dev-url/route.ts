import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

/**
 * PUT /api/v1/dev-url — Register a dev preview URL.
 * This does NOT modify the production frontend_url.
 * It stores the dev URL in the draft_manifest metadata so the admin
 * can offer a "dev preview" option without affecting production.
 *
 * Body: { devUrl: "http://localhost:3001" }
 * Requires: x-api-key header
 */
export async function PUT(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 });
  }

  const [tenant] = await db
    .select({ id: tenants.id, draftManifest: tenants.draftManifest })
    .from(tenants)
    .where(eq(tenants.apiKey, apiKey))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json();
  const devUrl = body?.devUrl;

  if (!devUrl || typeof devUrl !== "string") {
    return NextResponse.json({ error: "devUrl is required" }, { status: 400 });
  }

  // Store devUrl inside draft_manifest metadata (doesn't touch frontend_url)
  const currentDraft = (tenant.draftManifest as Record<string, any>) || { sections: [] };
  const updated = { ...currentDraft, devUrl: devUrl.replace(/\/+$/, "") };

  await db
    .update(tenants)
    .set({ draftManifest: updated, updatedAt: new Date().toISOString() })
    .where(eq(tenants.id, tenant.id));

  return NextResponse.json({ ok: true, devUrl });
}
