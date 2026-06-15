import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { getCommerceAdapterAsync } from "@/lib/commerce";

/**
 * GET /api/v1/commerce/suggestions?q=
 * Returns search suggestions from the configured e-commerce platform.
 */
export const GET = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const adapter = await getCommerceAdapterAsync(tenantId);
  if (!adapter) {
    return NextResponse.json({ suggestions: [] });
  }

  const query = req.nextUrl.searchParams.get("q") || "";
  if (!query.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await adapter.getSuggestions(query);
    return NextResponse.json({ suggestions, platform: adapter.platform });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
});
