import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";

/**
 * GET /api/v1/commerce/suggestions?q=
 * Returns search suggestions from the configured e-commerce platform.
 */
export async function GET(req: NextRequest) {
  const adapter = getCommerceAdapter();
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
}
