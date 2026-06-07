import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";

/**
 * GET /api/admin/integrations/unsplash?q=nature&page=1
 * Search Unsplash for stock photos to use in the media library.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY não configurada" }, { status: 500 });
  }

  const query = req.nextUrl.searchParams.get("q") || "business";
  const page = req.nextUrl.searchParams.get("page") || "1";
  const perPage = req.nextUrl.searchParams.get("per_page") || "20";

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Unsplash retornou ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    const images = data.results.map((img: any) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      small: img.urls.small,
      alt: img.alt_description || img.description || query,
      author: img.user.name,
      authorUrl: img.user.links.html,
      downloadUrl: img.links.download_location,
      width: img.width,
      height: img.height,
    }));

    return NextResponse.json({
      images,
      total: data.total,
      totalPages: data.total_pages,
      page: Number(page),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar imagens" },
      { status: 500 },
    );
  }
}
