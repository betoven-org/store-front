import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq, and, SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { auth } from "@brasa/core/auth";

export const TENANT_HEADER = "x-tenant-id";

export type Tenant = {
  id: number;
  slug: string;
  name: string;
  domain: string | null;
  subdomain: string | null;
  logoUrl: string | null;
  plan: string;
  active: boolean;
};

/**
 * Get current tenant ID.
 * Priority: x-tenant-id header (from middleware) → authenticated user's tenantId → fallback 1
 * This allows multi-tenant to work on a single domain (cms.brasa.tech)
 * by resolving tenant from the logged-in user when host-based resolution fails.
 */
export const getTenantId = cache(async (): Promise<number> => {
  const h = await headers();
  const headerVal = h.get(TENANT_HEADER);
  const headerTenantId = headerVal ? parseInt(headerVal, 10) : 1;

  // If middleware resolved a specific tenant (not default), use it
  if (headerTenantId > 1) return headerTenantId;

  // Otherwise try to resolve from authenticated user session
  try {
    const session = await auth();
    if (session?.user?.tenantId) return session.user.tenantId;
  } catch { /* not authenticated or auth unavailable */ }

  return headerTenantId;
});

/**
 * Get full tenant object.
 */
export const getTenant = cache(async (): Promise<Tenant | null> => {
  const id = await getTenantId();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return tenant || null;
});

/**
 * Creates a tenant filter SQL condition.
 * Usage: tenantFilter(posts.tenantId)
 */
export async function tenantFilter(column: PgColumn): Promise<SQL> {
  const id = await getTenantId();
  return eq(column, id);
}

/**
 * Combines tenant filter with additional conditions.
 * Usage: const where = await tenantAnd(posts.tenantId, eq(posts.status, "published"))
 */
export async function tenantAnd(column: PgColumn, ...conditions: (SQL | undefined)[]): Promise<SQL> {
  const id = await getTenantId();
  const filtered = conditions.filter(Boolean) as SQL[];
  return and(eq(column, id), ...filtered)!;
}
