import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/manifest — Upload manifest for a tenant.
 * Requires x-api-key header.
 *
 * Query params:
 *   ?env=dev   → saves to draft_manifest (dev mode, doesn't affect production)
 *   ?env=prod  → promotes to manifest (production, used by page builder)
 *
 * Default: env=dev (safe by default)
 *
 * Body: the full manifest JSON (same format as manifest.json)
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

  const env = req.nextUrl.searchParams.get("env") || "dev";

  if (env === "prod") {
    // Promote: update both manifest and draft_manifest
    await db
      .update(tenants)
      .set({
        manifest: body,
        draftManifest: body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenant.id));
  } else {
    // Dev: only update draft_manifest — production untouched
    await db
      .update(tenants)
      .set({
        draftManifest: body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenant.id));
  }

  return NextResponse.json({
    ok: true,
    env,
    sections: body.sections.length,
  });
}

/**
 * GET /api/v1/manifest — Fetch manifest for a tenant.
 * Requires x-api-key header.
 *
 * Query params:
 *   ?env=dev  → returns draft_manifest (includes unreleased sections)
 *   ?env=prod → returns manifest (production only)
 *
 * Default: env=prod
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 });
  }

  const [tenant] = await db
    .select({ manifest: tenants.manifest, draftManifest: tenants.draftManifest })
    .from(tenants)
    .where(eq(tenants.apiKey, apiKey))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const env = req.nextUrl.searchParams.get("env") || "prod";
  const data = env === "dev"
    ? (tenant.draftManifest || tenant.manifest || { sections: [] })
    : (tenant.manifest || { sections: [] });

  return NextResponse.json(data, {
    headers: { "Cache-Control": env === "dev" ? "no-store" : "s-maxage=60, stale-while-revalidate=300" },
  });
}
