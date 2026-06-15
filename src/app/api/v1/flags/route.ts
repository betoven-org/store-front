import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { evaluateAllFlags, evaluateFlag } from "@/lib/matchers/flag-evaluator";

/**
 * GET /api/v1/flags — Evaluate all flags for the current request
 * GET /api/v1/flags?key=my_flag — Evaluate a single flag
 *
 * Returns resolved flag values based on matchers + request context.
 * Used by frontend SDK to get personalized flag values.
 */
export const GET = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const key = req.nextUrl.searchParams.get("key");

  if (key) {
    const result = await evaluateFlag(tenantId, key, req);
    if (!result) {
      return NextResponse.json({ key, value: null, matched: false });
    }
    return NextResponse.json({
      key: result.flagKey,
      value: result.value,
      variantId: result.variantId,
      variantName: result.variantName,
      matched: true,
    });
  }

  // Evaluate all flags
  const results = await evaluateAllFlags(tenantId, req);

  // Simplify to { key: value } map
  const simplified: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(results)) {
    simplified[k] = v.value;
  }

  return NextResponse.json({
    flags: simplified,
    _detailed: results,
  });
});
