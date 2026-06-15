import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";

/**
 * GET /api/admin/fonts?q=roboto
 *
 * Searches Google Fonts API and returns font families with weights.
 * Used by the theme editor to pick fonts.
 */

const GOOGLE_FONTS_API = "https://www.googleapis.com/webfonts/v1/webfonts";

type GoogleFont = {
  family: string;
  variants: string[];
  category: string;
  subsets: string[];
};

// In-memory cache of the full font list (refreshed every 24h)
let fontCache: GoogleFont[] | null = null;
let fontCacheAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function loadFonts(): Promise<GoogleFont[]> {
  if (fontCache && Date.now() - fontCacheAt < CACHE_TTL) {
    return fontCache;
  }

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    // Fallback: return popular fonts
    return POPULAR_FONTS;
  }

  try {
    const res = await fetch(`${GOOGLE_FONTS_API}?key=${apiKey}&sort=popularity`);
    if (!res.ok) return POPULAR_FONTS;
    const data = await res.json();
    fontCache = data.items as GoogleFont[];
    fontCacheAt = Date.now();
    return fontCache;
  } catch {
    return POPULAR_FONTS;
  }
}

const POPULAR_FONTS: GoogleFont[] = [
  { family: "Inter", variants: ["300", "400", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Roboto", variants: ["300", "400", "500", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Open Sans", variants: ["300", "400", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Montserrat", variants: ["300", "400", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Lato", variants: ["300", "400", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Poppins", variants: ["300", "400", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Geist", variants: ["300", "400", "500", "600", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "DM Sans", variants: ["400", "500", "700"], category: "sans-serif", subsets: ["latin"] },
  { family: "Playfair Display", variants: ["400", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "Fraunces", variants: ["300", "400", "500", "600", "700"], category: "serif", subsets: ["latin"] },
  { family: "Merriweather", variants: ["300", "400", "700"], category: "serif", subsets: ["latin"] },
  { family: "Source Code Pro", variants: ["300", "400", "500", "700"], category: "monospace", subsets: ["latin"] },
  { family: "JetBrains Mono", variants: ["400", "500", "700"], category: "monospace", subsets: ["latin"] },
  { family: "Fira Code", variants: ["300", "400", "500", "700"], category: "monospace", subsets: ["latin"] },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;

  const fonts = await loadFonts();

  const filtered = query
    ? fonts.filter((f) => f.family.toLowerCase().includes(query))
    : fonts;

  const results = filtered.slice(0, limit).map((f) => ({
    family: f.family,
    variants: f.variants,
    category: f.category,
    preview: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@400&display=swap`,
  }));

  return NextResponse.json(results);
}
