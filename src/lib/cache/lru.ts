/**
 * Simple LRU cache with TTL support.
 * Used as Tier 1 (in-memory) of the tiered caching system.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class LRUCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Get even if expired (for stale-while-revalidate).
   */
  getStale(key: string): { value: T; stale: boolean } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const stale = Date.now() > entry.expiresAt;

    // Move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { value: entry.value, stale };
  }

  set(key: string, value: T, ttlMs: number) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  /** Purge all expired entries */
  purge() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}
