import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { redirects } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";

/**
 * GET /api/v1/redirects — Returns all active redirects for the tenant.
 * Frontend should call this at build time or on request to handle redirects.
 */
export const GET = withApiKey(async ({ tenantId }) => {
  const rows = await db
    .select({ from: redirects.from, to: redirects.to, type: redirects.type })
    .from(redirects)
    .where(and(eq(redirects.tenantId, tenantId), eq(redirects.active, true)));

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
});
