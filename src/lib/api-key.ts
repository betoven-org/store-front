import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import {
  isNeonDown,
  isNeonConnectionError,
  markNeonDown,
  markNeonUp,
  warmSyncConfigs,
  isTenantWarmed,
} from "./neon-fallback";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const keyCache = new Map<string, { tenantId: number; revalidateSecret: string | null; ts: number }>();

async function resolveApiKey(apiKey: string) {
  const cached = keyCache.get(apiKey);

  // Neon down → use stale cache (any age)
  if (isNeonDown() && cached) {
    return cached;
  }

  // Cache still fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached;
  }

  try {
    const [tenant] = await db
      .select({ id: tenants.id, revalidateSecret: tenants.revalidateSecret })
      .from(tenants)
      .where(eq(tenants.apiKey, apiKey))
      .limit(1);

    if (!tenant) return null;

    markNeonUp();

    // Warm sync config cache on first success per tenant
    if (!isTenantWarmed(tenant.id)) {
      warmSyncConfigsForTenant(tenant.id);
    }

    const entry = { tenantId: tenant.id, revalidateSecret: tenant.revalidateSecret, ts: Date.now() };
    keyCache.set(apiKey, entry);
    return entry;
  } catch (err) {
    if (isNeonConnectionError(err)) {
      markNeonDown();
      if (cached) return cached; // stale is better than nothing
    }
    throw err;
  }
}

/** Fire-and-forget: load all synced collection configs into memory cache */
async function warmSyncConfigsForTenant(tenantId: number) {
  try {
    const { db: appDb } = await import("@/db");
    const { collections } = await import("@/db/schema");

    const rows = await appDb.query.collections.findMany({
      where: eq(collections.tenantId, tenantId),
    });

    warmSyncConfigs(
      tenantId,
      rows.map((r) => ({ slug: r.slug, source: r.source, syncConfig: r.syncConfig })),
    );
  } catch {
    // best-effort — will retry on next request
  }
}

const CACHE_HEADER = "Cache-Control";
const DEFAULT_CACHE = "s-maxage=60, stale-while-revalidate=300";

export interface ApiContext {
  tenantId: number;
  draft: boolean;
}

/**
 * Wraps a route handler with API key auth + cache headers + draft mode.
 *
 * Draft mode is activated when `?draft=true` is present AND the
 * `x-preview-secret` header matches the tenant's `revalidate_secret`.
 */
export function withApiKey(
  handler: (ctx: ApiContext, req: NextRequest, params: any) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 },
      );
    }

    const resolved = await resolveApiKey(apiKey);
    if (!resolved) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      );
    }

    // Draft mode check
    let draft = false;
    const wantsDraft = req.nextUrl.searchParams.get("draft") === "true";
    if (wantsDraft) {
      const previewSecret = req.headers.get("x-preview-secret");
      if (previewSecret && previewSecret === resolved.revalidateSecret) {
        draft = true;
      }
      // If secret doesn't match, silently ignore draft flag (return published only)
    }

    const params = await context.params;
    const ctx: ApiContext = { tenantId: resolved.tenantId, draft };
    const res = await handler(ctx, req, params);

    if (!res.headers.has(CACHE_HEADER)) {
      // Don't cache draft responses
      if (draft) {
        res.headers.set(CACHE_HEADER, "no-store");
      } else {
        res.headers.set(CACHE_HEADER, DEFAULT_CACHE);
      }
    }

    return res;
  };
}
