import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

/**
 * PUT /api/v1/dev-url — Sets the frontend_url for preview in dev mode.
 * Called by the frontend's dev-connect script to point the CMS preview
 * to the developer's localhost.
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
    .select({ id: tenants.id })
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

  await db
    .update(tenants)
    .set({
      frontendUrl: devUrl.replace(/\/+$/, ""),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tenants.id, tenant.id));

  return NextResponse.json({ ok: true, frontendUrl: devUrl });
}
