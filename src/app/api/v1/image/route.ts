import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * GET /api/v1/image?src=...&w=...&h=...&q=...&f=...&fit=...
 *
 * Image optimization proxy. Fetches the source image, resizes/converts
 * on-the-fly using sharp, and returns with aggressive cache headers.
 *
 * Params:
 * - src: source URL (required)
 * - w: width in px (optional, default: original)
 * - h: height in px (optional)
 * - q: quality 1-100 (optional, default: 80)
 * - f: format — auto|webp|avif|jpeg|png (optional, default: auto)
 * - fit: cover|contain|fill|inside|outside (optional, default: cover)
 */

const ALLOWED_HOSTS = [
  "hsixbybpwvhvkwxeaxup.supabase.co",
  ".supabase.co",
  ".public.blob.vercel-storage.com",
];

const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some((h) =>
      h.startsWith(".") ? hostname.endsWith(h) : hostname === h
    );
  } catch {
    return false;
  }
}

type Format = "webp" | "avif" | "jpeg" | "png";

function negotiateFormat(accept: string | null, requested?: string): Format {
  if (requested && requested !== "auto") return requested as Format;
  if (accept?.includes("image/avif")) return "avif";
  if (accept?.includes("image/webp")) return "webp";
  return "jpeg";
}

const QUALITY_PRESETS: Record<string, number> = {
  low: 60,
  medium: 75,
  high: 85,
  original: 100,
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const src = searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }

  if (!isAllowedHost(src)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const w = Math.min(Number(searchParams.get("w")) || 0, MAX_WIDTH);
  const h = Math.min(Number(searchParams.get("h")) || 0, MAX_HEIGHT);
  const qParam = searchParams.get("q") || "80";
  const q = QUALITY_PRESETS[qParam] ?? Math.min(Math.max(Number(qParam) || 80, 1), 100);
  const fit = (searchParams.get("fit") || "cover") as keyof sharp.FitEnum;
  const format = negotiateFormat(
    req.headers.get("accept"),
    searchParams.get("f") || undefined
  );

  try {
    const res = await fetch(src, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch source: ${res.status}` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    let pipeline = sharp(buffer);

    // Resize only if dimensions specified
    if (w || h) {
      pipeline = pipeline.resize({
        width: w || undefined,
        height: h || undefined,
        fit,
        withoutEnlargement: true,
      });
    }

    // Convert format
    switch (format) {
      case "avif":
        pipeline = pipeline.avif({ quality: q });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality: q });
        break;
      case "png":
        pipeline = pipeline.png({ quality: q });
        break;
      default:
        pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
    }

    const output = await pipeline.toBuffer();

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": `image/${format}`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000",
        Vary: "Accept",
      },
    });
  } catch (err) {
    console.error("[image] Optimization failed:", err);
    // Fallback: redirect to original
    return NextResponse.redirect(src, 302);
  }
}
