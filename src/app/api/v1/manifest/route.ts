import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/manifest — Upload manifest for a tenant.
 * Requires x-api-key header.
 * Body: the full manifest JSON (same format as manifest.json)
 *
 * This endpoint is called by the frontend on dev (watch mode)
 * and on deploy (CI/CD) to sync available sections with the CMS.
 */
export async function POST(req: NextRequest) {
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

  if (!body || !Array.isArray(body.sections)) {
    return NextResponse.json(
      { error: "Invalid manifest: must have a sections array" },
      { status: 400 }
    );
  }

  await db
    .update(tenants)
    .set({
      manifest: body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tenants.id, tenant.id));

  return NextResponse.json({
    ok: true,
    sections: body.sections.length,
  });
}

/**
 * GET /api/v1/manifest — Fetch current manifest for a tenant.
 * Requires x-api-key header.
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 });
  }

  const [tenant] = await db
    .select({ manifest: tenants.manifest })
    .from(tenants)
    .where(eq(tenants.apiKey, apiKey))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!tenant.manifest) {
    return NextResponse.json({ sections: [] });
  }

  return NextResponse.json(tenant.manifest, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
