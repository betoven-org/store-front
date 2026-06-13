/**
 * Cache TTL configuration (in seconds).
 *
 * These are FALLBACK TTLs — on-demand revalidation via tags is the primary
 * invalidation mechanism. TTLs exist as a safety net so stale data eventually
 * refreshes even if a revalidateTag() call is missed.
 *
 * Three tiers:
 *
 * 1. VOLATILE — Data that changes frequently or is synced from external sources
 *    (collections synced from Supabase, search results).
 *    TTL: 30s
 *
 * 2. EDITORIAL — Content managed by editors (posts, pages, products).
 *    TTL: 60s
 *
 * 3. STABLE — Configuration that rarely changes (settings, categories, authors).
 *    TTL: 300s (5 min)
 */

// Tier 1 — Volatile
export const CACHE_TTL_VOLATILE = 30;

// Tier 2 — Editorial
export const CACHE_TTL_EDITORIAL = 60;

// Tier 3 — Stable config
export const CACHE_TTL_STABLE = 300;
