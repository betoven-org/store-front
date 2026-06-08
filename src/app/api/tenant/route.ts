import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants, users } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve tenant by hostname or user email. Called by middleware.
 * GET /api/tenant?host=example.com
 * GET /api/tenant?email=user@example.com (resolve tenant from user record)
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const host = req.nextUrl.searchParams.get("host");

  // Resolve by user email (used by middleware for session-based tenant resolution)
  if (email) {
    const [user] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) return NextResponse.json({ id: user.tenantId });
    return NextResponse.json({ id: 1 });
  }

  if (!host) return NextResponse.json({ id: 1 });

  const hostname = host.split(":")[0];

  // Try exact domain match
  const [byDomain] = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.domain, hostname))
    .limit(1);

  if (byDomain) return NextResponse.json(byDomain);

  // Try subdomain match
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    const sub = parts[0];
    const [bySub] = await db
      .select({ id: tenants.id, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.subdomain, sub))
      .limit(1);

    if (bySub) return NextResponse.json(bySub);
  }

  // Fallback: default tenant
  return NextResponse.json({ id: 1 });
}
