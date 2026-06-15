/**
 * Flag evaluator — resolves which variant to show for a given request.
 *
 * Evaluation order:
 * 1. Variants sorted by sortOrder
 * 2. First variant whose matcher evaluates to true wins
 * 3. Variant without matcher = fallback (last resort)
 * 4. If no match, returns null (flag effectively off)
 */

import { db as appDb } from "@/db";
import { flags, flagVariants, matchers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { evaluateMatcher, buildMatcherContext, type MatcherRecord } from "./engine";
import type { MatcherContext } from "./types";

type FlagResult = {
  flagId: number;
  flagKey: string;
  variantId: number;
  variantName: string;
  value: unknown;
};

/**
 * Evaluate a single flag for a request.
 */
export async function evaluateFlag(
  tenantId: number,
  flagKey: string,
  req: Request
): Promise<FlagResult | null> {
  // Fetch flag with variants
  const flag = await appDb.query.flags.findFirst({
    where: and(eq(flags.tenantId, tenantId), eq(flags.key, flagKey), eq(flags.enabled, true)),
    with: {
      variants: {
        orderBy: [asc(flagVariants.sortOrder)],
      },
    },
  });

  if (!flag || !flag.variants?.length) return null;

  const ctx = buildMatcherContext(req);

  // Load all matchers referenced by variants
  const matcherIds = flag.variants
    .map((v) => v.matcherId)
    .filter((id): id is number => id !== null);

  let matcherMap = new Map<number, MatcherRecord>();

  if (matcherIds.length > 0) {
    const matcherRows = await appDb
      .select()
      .from(matchers)
      .where(and(eq(matchers.tenantId, tenantId)));

    matcherMap = new Map(
      matcherRows.map((m) => [m.id, { id: m.id, type: m.type, config: m.config as Record<string, unknown> }])
    );
  }

  // Evaluate variants in order
  let fallback: typeof flag.variants[0] | null = null;

  for (const variant of flag.variants) {
    if (!variant.matcherId) {
      // No matcher = fallback variant
      if (!fallback) fallback = variant;
      continue;
    }

    const matcher = matcherMap.get(variant.matcherId);
    if (!matcher) continue;

    if (evaluateMatcher(matcher, ctx, matcherMap)) {
      return {
        flagId: flag.id,
        flagKey: flag.key,
        variantId: variant.id,
        variantName: variant.name,
        value: variant.value,
      };
    }
  }

  // No matcher matched — use fallback
  if (fallback) {
    return {
      flagId: flag.id,
      flagKey: flag.key,
      variantId: fallback.id,
      variantName: fallback.name,
      value: fallback.value,
    };
  }

  return null;
}

/**
 * Evaluate ALL enabled flags for a tenant, returning a map of flagKey → value.
 */
export async function evaluateAllFlags(
  tenantId: number,
  req: Request
): Promise<Record<string, FlagResult>> {
  const allFlags = await appDb.query.flags.findMany({
    where: and(eq(flags.tenantId, tenantId), eq(flags.enabled, true)),
    with: {
      variants: {
        orderBy: [asc(flagVariants.sortOrder)],
      },
    },
  });

  if (!allFlags.length) return {};

  const ctx = buildMatcherContext(req);

  // Load all matchers for this tenant once
  const matcherRows = await appDb
    .select()
    .from(matchers)
    .where(eq(matchers.tenantId, tenantId));

  const matcherMap = new Map(
    matcherRows.map((m) => [m.id, { id: m.id, type: m.type, config: m.config as Record<string, unknown> }])
  );

  const results: Record<string, FlagResult> = {};

  for (const flag of allFlags) {
    if (!flag.variants?.length) continue;

    let fallback: typeof flag.variants[0] | null = null;
    let matched = false;

    for (const variant of flag.variants) {
      if (!variant.matcherId) {
        if (!fallback) fallback = variant;
        continue;
      }

      const matcher = matcherMap.get(variant.matcherId);
      if (!matcher) continue;

      if (evaluateMatcher(matcher, ctx, matcherMap)) {
        results[flag.key] = {
          flagId: flag.id,
          flagKey: flag.key,
          variantId: variant.id,
          variantName: variant.name,
          value: variant.value,
        };
        matched = true;
        break;
      }
    }

    if (!matched && fallback) {
      results[flag.key] = {
        flagId: flag.id,
        flagKey: flag.key,
        variantId: fallback.id,
        variantName: fallback.name,
        value: fallback.value,
      };
    }
  }

  return results;
}
