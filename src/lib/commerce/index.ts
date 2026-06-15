/**
 * Brasa CMS — Commerce Module
 *
 * Auto-detects the configured e-commerce platform from env vars
 * and returns the appropriate adapter.
 *
 * Supported platforms:
 *   - VTEX (VTEX_ACCOUNT)
 *   - Shopify (SHOPIFY_STORE + SHOPIFY_STOREFRONT_TOKEN)
 *   - Nuvemshop (NUVEMSHOP_STORE_ID + NUVEMSHOP_ACCESS_TOKEN)
 *   - Wake (WAKE_STORE_URL + WAKE_TOKEN)
 *   - VNDA (VNDA_DOMAIN + VNDA_TOKEN)
 *   - Linx (LINX_STORE_ID + LINX_API_KEY)
 */

import type { CommerceAdapter } from "./types";
import { createVtexAdapter } from "./adapters/vtex/index";
import { createShopifyAdapter } from "./adapters/shopify";
import { createNuvemshopAdapter } from "./adapters/nuvemshop";
import { createWakeAdapter } from "./adapters/wake";
import { createVndaAdapter } from "./adapters/vnda";
import { createLinxAdapter } from "./adapters/linx";

export type { CommerceAdapter } from "./types";
export type * from "./types";

// Per-tenant adapter cache (tenantId → adapter)
const adapterCache = new Map<number, CommerceAdapter | null>();

/**
 * Get commerce adapter from env vars (legacy / single-tenant).
 */
function getAdapterFromEnv(): CommerceAdapter | null {
  if (process.env.VTEX_ACCOUNT) {
    return createVtexAdapter({
      account: process.env.VTEX_ACCOUNT,
      environment: process.env.VTEX_ENVIRONMENT,
      salesChannel: process.env.VTEX_SALES_CHANNEL,
      appKey: process.env.VTEX_APP_KEY,
      appToken: process.env.VTEX_APP_TOKEN,
    });
  } else if (process.env.SHOPIFY_STORE && process.env.SHOPIFY_STOREFRONT_TOKEN) {
    return createShopifyAdapter({
      store: process.env.SHOPIFY_STORE,
      storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
      apiVersion: process.env.SHOPIFY_API_VERSION,
    });
  } else if (process.env.NUVEMSHOP_STORE_ID && process.env.NUVEMSHOP_ACCESS_TOKEN) {
    return createNuvemshopAdapter({
      storeId: process.env.NUVEMSHOP_STORE_ID,
      accessToken: process.env.NUVEMSHOP_ACCESS_TOKEN,
    });
  } else if (process.env.WAKE_STORE_URL && process.env.WAKE_TOKEN) {
    return createWakeAdapter({
      storeUrl: process.env.WAKE_STORE_URL,
      token: process.env.WAKE_TOKEN,
    });
  } else if (process.env.VNDA_DOMAIN && process.env.VNDA_TOKEN) {
    return createVndaAdapter({
      domain: process.env.VNDA_DOMAIN,
      token: process.env.VNDA_TOKEN,
    });
  } else if (process.env.LINX_STORE_ID && process.env.LINX_API_KEY) {
    return createLinxAdapter({
      storeId: process.env.LINX_STORE_ID,
      apiKey: process.env.LINX_API_KEY,
      baseUrl: process.env.LINX_BASE_URL,
    });
  }
  return null;
}

/**
 * Get commerce adapter from tenant_integrations DB config.
 */
function getAdapterFromConfig(config: Record<string, unknown>): CommerceAdapter | null {
  const platform = config.platform as string;

  switch (platform) {
    case "vtex":
      if (!config.account) return null;
      return createVtexAdapter({
        account: config.account as string,
        environment: (config.environment as string) || "vtexcommercestable.com.br",
        salesChannel: config.salesChannel as string,
        appKey: config.appKey as string,
        appToken: config.appToken as string,
      });
    case "shopify":
      if (!config.store || !config.storefrontToken) return null;
      return createShopifyAdapter({
        store: config.store as string,
        storefrontToken: config.storefrontToken as string,
        apiVersion: config.apiVersion as string,
      });
    case "nuvemshop":
      if (!config.storeId || !config.accessToken) return null;
      return createNuvemshopAdapter({
        storeId: config.storeId as string,
        accessToken: config.accessToken as string,
      });
    case "wake":
      if (!config.storeUrl || !config.token) return null;
      return createWakeAdapter({
        storeUrl: config.storeUrl as string,
        token: config.token as string,
      });
    default:
      return null;
  }
}

/**
 * Get commerce adapter — tries DB config first, then falls back to env vars.
 */
export function getCommerceAdapter(tenantId?: number): CommerceAdapter | null {
  // Env-only mode (no tenant)
  if (!tenantId) return getAdapterFromEnv();

  // Check cache
  if (adapterCache.has(tenantId)) return adapterCache.get(tenantId) || null;

  // Will be populated by getCommerceAdapterAsync
  return getAdapterFromEnv();
}

/**
 * Async version — loads config from DB for the given tenant.
 * Use this in API routes where you have tenant context.
 */
export async function getCommerceAdapterAsync(tenantId: number): Promise<CommerceAdapter | null> {
  if (adapterCache.has(tenantId)) return adapterCache.get(tenantId) || null;

  try {
    const { db: appDb } = await import("@/db");
    const { tenantIntegrations } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const [integration] = await appDb
      .select({ config: tenantIntegrations.config, enabled: tenantIntegrations.enabled })
      .from(tenantIntegrations)
      .where(
        and(
          eq(tenantIntegrations.tenantId, tenantId),
          eq(tenantIntegrations.integration, "vtex"),
          eq(tenantIntegrations.enabled, true)
        )
      )
      .limit(1);

    if (integration?.config) {
      const adapter = getAdapterFromConfig(integration.config as Record<string, unknown>);
      if (adapter) {
        adapterCache.set(tenantId, adapter);
        return adapter;
      }
    }
  } catch {
    // DB not available — fall through
  }

  // Fallback to env vars
  const adapter = getAdapterFromEnv();
  adapterCache.set(tenantId, adapter);
  return adapter;
}

/** Clear cached adapter for a tenant (call after config update) */
export function clearCommerceAdapterCache(tenantId: number) {
  adapterCache.delete(tenantId);
}

/**
 * Helper to get platform name for display.
 */
export function getCommercePlatform(): string | null {
  const adapter = getCommerceAdapter();
  return adapter?.platform || null;
}
