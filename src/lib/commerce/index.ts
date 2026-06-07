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
import { createVtexAdapter } from "./adapters/vtex";
import { createShopifyAdapter } from "./adapters/shopify";
import { createNuvemshopAdapter } from "./adapters/nuvemshop";
import { createWakeAdapter } from "./adapters/wake";
import { createVndaAdapter } from "./adapters/vnda";
import { createLinxAdapter } from "./adapters/linx";

export type { CommerceAdapter } from "./types";
export type * from "./types";

let _adapter: CommerceAdapter | null = null;

export function getCommerceAdapter(): CommerceAdapter | null {
  if (_adapter) return _adapter;

  if (process.env.VTEX_ACCOUNT) {
    _adapter = createVtexAdapter({
      account: process.env.VTEX_ACCOUNT,
      environment: process.env.VTEX_ENVIRONMENT,
      salesChannel: process.env.VTEX_SALES_CHANNEL,
    });
  } else if (process.env.SHOPIFY_STORE && process.env.SHOPIFY_STOREFRONT_TOKEN) {
    _adapter = createShopifyAdapter({
      store: process.env.SHOPIFY_STORE,
      storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN,
      apiVersion: process.env.SHOPIFY_API_VERSION,
    });
  } else if (process.env.NUVEMSHOP_STORE_ID && process.env.NUVEMSHOP_ACCESS_TOKEN) {
    _adapter = createNuvemshopAdapter({
      storeId: process.env.NUVEMSHOP_STORE_ID,
      accessToken: process.env.NUVEMSHOP_ACCESS_TOKEN,
    });
  } else if (process.env.WAKE_STORE_URL && process.env.WAKE_TOKEN) {
    _adapter = createWakeAdapter({
      storeUrl: process.env.WAKE_STORE_URL,
      token: process.env.WAKE_TOKEN,
    });
  } else if (process.env.VNDA_DOMAIN && process.env.VNDA_TOKEN) {
    _adapter = createVndaAdapter({
      domain: process.env.VNDA_DOMAIN,
      token: process.env.VNDA_TOKEN,
    });
  } else if (process.env.LINX_STORE_ID && process.env.LINX_API_KEY) {
    _adapter = createLinxAdapter({
      storeId: process.env.LINX_STORE_ID,
      apiKey: process.env.LINX_API_KEY,
      baseUrl: process.env.LINX_BASE_URL,
    });
  }

  return _adapter;
}

/**
 * Helper to get platform name for display.
 */
export function getCommercePlatform(): string | null {
  const adapter = getCommerceAdapter();
  return adapter?.platform || null;
}
