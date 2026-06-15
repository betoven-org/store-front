/**
 * Tiered Cache Manager — LRU in-memory + single flight dedup + stale-while-revalidate.
 * Inspired by deco/runtime/caches (Apache-2.0).
 *
 * Usage:
 *   import { cache } from "@/lib/cache";
 *
 *   const data = await cache.getOrSet("products:featured", async () => {
 *     return await db.query.products.findMany(...);
 *   }, { ttl: 60_000, swr: 300_000, tags: ["products"] });
 */

import { LRUCache } from "./lru";

type CacheOptions = {
  /** Time-to-live in ms (default: 60s) */
  ttl?: number;
  /** Stale-while-revalidate window in ms (default: 5min).
   *  Serves stale data while refreshing in background. */
  swr?: number;
  /** Cache tags for invalidation */
  tags?: string[];
};

// ── Single flight dedup ─────────────────────────────────────────────────────
const inflight = new Map<string, Promise<unknown>>();

// ── LRU tier ────────────────────────────────────────────────────────────────
const lru = new LRUCache(500);

// ── Tag→keys mapping for invalidation ───────────────────────────────────────
const tagMap = new Map<string, Set<string>>();

function registerTags(key: string, tags: string[]) {
  for (const tag of tags) {
    if (!tagMap.has(tag)) tagMap.set(tag, new Set());
    tagMap.get(tag)!.add(key);
  }
}

// ── Metrics ─────────────────────────────────────────────────────────────────
let hits = 0;
let misses = 0;
let staleHits = 0;

/**
 * Get-or-set with tiered caching, single flight dedup, and stale-while-revalidate.
 */
async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CacheOptions = {}
): Promise<T> {
  const { ttl = 60_000, swr = 300_000, tags = [] } = opts;

  // 1. Check LRU (fresh)
  const fresh = lru.get(key);
  if (fresh !== undefined) {
    hits++;
    return fresh as T;
  }

  // 2. Check LRU (stale) — serve stale while revalidating
  const staleEntry = lru.getStale(key);
  if (staleEntry && swr > 0) {
    staleHits++;
    // Revalidate in background (no await)
    revalidate(key, fetcher, ttl + swr, tags);
    return staleEntry.value as T;
  }

  misses++;

  // 3. Single flight — dedup concurrent requests for same key
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().then((data) => {
    lru.set(key, data, ttl + swr);
    registerTags(key, tags);
    inflight.delete(key);
    return data;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

/** Background revalidation (fire-and-forget) */
function revalidate<T>(key: string, fetcher: () => Promise<T>, totalTtl: number, tags: string[]) {
  if (inflight.has(key)) return; // Already revalidating

  const promise = fetcher().then((data) => {
    lru.set(key, data, totalTtl);
    registerTags(key, tags);
    inflight.delete(key);
  }).catch(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
}

/**
 * Invalidate all cache entries with the given tag.
 */
function invalidateTag(tag: string) {
  const keys = tagMap.get(tag);
  if (!keys) return;

  for (const key of keys) {
    lru.delete(key);
  }
  tagMap.delete(tag);
}

/**
 * Invalidate a specific key.
 */
function invalidateKey(key: string) {
  lru.delete(key);
}

/**
 * Clear all caches.
 */
function clear() {
  lru.clear();
  tagMap.clear();
  inflight.clear();
  hits = 0;
  misses = 0;
  staleHits = 0;
}

/**
 * Get cache metrics for monitoring.
 */
function metrics() {
  const total = hits + misses + staleHits;
  return {
    size: lru.size,
    hits,
    misses,
    staleHits,
    hitRate: total > 0 ? ((hits + staleHits) / total * 100).toFixed(1) + "%" : "0%",
    inflight: inflight.size,
  };
}

export const cache = {
  getOrSet,
  invalidateTag,
  invalidateKey,
  clear,
  metrics,
};
