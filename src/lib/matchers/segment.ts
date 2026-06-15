/**
 * Segment hash — generates a cache-segmentation key from evaluated flags.
 * Inspired by deco/utils/segment.ts (Apache-2.0).
 *
 * Each unique combination of flag results produces a different segment hash,
 * allowing CDN/edge caching to serve different content per audience.
 */

/**
 * Generate a stable segment hash from flag evaluation results.
 * Uses a simple FNV-1a hash for speed.
 */
export function computeSegmentHash(
  flagResults: Record<string, unknown>,
  revision?: string
): string {
  const keys = Object.keys(flagResults).sort();
  if (keys.length === 0 && !revision) return "default";

  const parts = keys.map((k) => `${k}=${JSON.stringify(flagResults[k])}`);
  if (revision) parts.push(`rev=${revision}`);

  const str = parts.join("|");
  return fnv1a(str);
}

/** FNV-1a 32-bit hash — fast, non-cryptographic */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
