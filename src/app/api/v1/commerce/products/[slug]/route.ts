import { NextRequest, NextResponse } from "next/server";
import { getCommerceAdapter } from "@/lib/commerce";

/**
 * GET /api/v1/commerce/products/:slug
 * Returns product details from the configured e-commerce platform.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const adapter = getCommerceAdapter();
  if (!adapter) {
    return NextResponse.json(
      { error: "Nenhuma plataforma de e-commerce configurada" },
      { status: 400 },
    );
  }

  const { slug } = await params;

  try {
    const result = await adapter.getProduct(slug);
    if (!result) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar produto" },
      { status: 500 },
    );
  }
}
