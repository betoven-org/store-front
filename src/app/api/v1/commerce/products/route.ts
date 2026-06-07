import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";

/**
 * GET /api/v1/commerce/products?q=&category=&page=&limit=&sort=
 * Returns products from the configured e-commerce platform.
 */
export async function GET(req: NextRequest) {
  const adapter = getCommerceAdapter();
  if (!adapter) {
    return NextResponse.json(
      { error: "Nenhuma plataforma de e-commerce configurada" },
      { status: 400 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const query = sp.get("q") || undefined;
  const category = sp.get("category") || undefined;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 20;
  const sort = sp.get("sort") || undefined;

  try {
    const result = await adapter.searchProducts({ query, category, page, limit, sort });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar produtos" },
      { status: 500 },
    );
  }
}
