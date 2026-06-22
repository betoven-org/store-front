import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as legacyDb } from "@brasa/core/db";
import { products, media } from "@brasa/core/schema";
import { db } from "@/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, querySupabase,
} from "@/lib/neon-fallback";

// ── Resolve a single media ID to URL ─────────────────────────────────────────

async function resolveMediaId(
  mediaId: string,
): Promise<{ url: string; alt: string } | null> {
  if (!/^\d+$/.test(mediaId)) return null;
  const [row] = await legacyDb
    .select({ url: media.url, alt: media.alt })
    .from(media)
    .where(eq(media.id, Number(mediaId)))
    .limit(1);
  return row ? { url: row.url, alt: row.alt || "" } : null;
}

// ── Resolve category UUID to { id, name, slug } ─────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCategoryUuid(
  uuid: string,
  tenantId: number,
): Promise<{ id: number; name: string; slug: string } | null> {
  const catCollection = await db.query.collections.findFirst({
    where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "categorias")),
  });
  if (!catCollection) return null;

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.collectionId, catCollection.id),
      eq(collectionItems.tenantId, tenantId),
      eq(collectionItems.externalId, uuid),
    ),
  });
  if (!item) return null;

  const cd = (item.data ?? {}) as Record<string, any>;
  return { id: item.id, name: cd.name || "", slug: item.slug };
}

// ── Transform collection item data → legacy single product format ──────────

async function mapCollectionItemToFullProduct(item: typeof collectionItems.$inferSelect, tenantId: number) {
  const d = (item.data ?? {}) as Record<string, any>;

  // Resolve image (could be media ID or URL)
  const imgVal = d.image || d.hero_image;
  let imageObj: Record<string, any> | null = null;
  if (typeof imgVal === "string" && /^\d+$/.test(imgVal)) {
    const resolved = await resolveMediaId(imgVal);
    if (resolved) imageObj = { url: resolved.url, alt: resolved.alt || d.name || "", cardUrl: null, heroUrl: null };
  } else if (imgVal) {
    imageObj = {
      url: typeof imgVal === "string" ? imgVal : (imgVal?.url || null),
      alt: imgVal?.alt || d.name || "",
      cardUrl: imgVal?.cardUrl || null,
      heroUrl: imgVal?.heroUrl || null,
    };
  }

  return {
    id: item.id,
    name: d.name || d.nome || null,
    slug: item.slug,
    description: d.description || d.descricao || null,
    content: d.content || d.conteudo || null,
    composition: d.composition || d.composicao || null,
    usageInstructions: d.usageInstructions || d.usage_instructions || null,
    whoCanUse: d.whoCanUse || d.who_can_use || null,
    benefits: d.benefits || d.beneficios || null,
    differentials: d.differentials || d.diferenciais || null,
    faq: d.faq || null,
    brand: d.brand || d.marca || null,
    isKit: d.isKit || d.is_kit || false,
    featured: item.featured,
    seoTitle: d.seoTitle || d.seo_title || null,
    seoDescription: d.seoDescription || d.seo_description || null,
    publishedAt: item.publishedAt,
    category: typeof d.category === "string" && UUID_RE.test(d.category)
      ? await resolveCategoryUuid(d.category, tenantId)
      : d.category && typeof d.category === "object"
        ? { id: d.category.id || null, name: d.category.name || null, slug: d.category.slug || null }
        : d.categoryName
          ? { id: null, name: d.categoryName, slug: d.categorySlug || null }
          : null,
    image: imageObj,
    gallery: Array.isArray(d.gallery)
      ? d.gallery.map((g: any) => ({
          id: g.id || null,
          url: typeof g === "string" ? g : g.url,
          alt: g.alt || "",
        }))
      : [],
  };
}

export const GET = withApiKey(async ({ tenantId }, _req, params) => {
  const { slug } = params;

  // ── 1. Supabase (primary) ─────────────────────────────────────────────
  const sb = await productBySlugFromSupabase(tenantId, slug);
  if (sb) return sb;

  // ── 2. Neon (backup) ──────────────────────────────────────────────────
  if (isNeonDown()) {
    return NextResponse.json({ error: "All databases unavailable" }, { status: 503 });
  }

  try {
  // ── Try collection_items first ───────────────────────────────────────────
  const prodCollection = await db.query.collections.findFirst({
    where: and(eq(collections.tenantId, tenantId), eq(collections.slug, "produtos")),
  });

  if (prodCollection) {
    const item = await db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.collectionId, prodCollection.id),
        eq(collectionItems.slug, slug),
        eq(collectionItems.status, "published"),
        isNull(collectionItems.deletedAt),
      ),
    });

    if (item) {
      return NextResponse.json(await mapCollectionItemToFullProduct(item, tenantId));
    }

    // Not found in collection — fall through to legacy
  }

  // ── Fallback: legacy products table ──────────────────────────────────────

  const row = await legacyDb.query.products.findFirst({
    where: and(
      eq(products.tenantId, tenantId),
      eq(products.slug, slug),
      eq(products.status, "published"),
    ),
    with: {
      category: true,
      image: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Resolve gallery images
  let gallery: { id: number; url: string; alt: string }[] = [];
  const galleryIds = row.galleryImages as number[] | null;
  if (galleryIds && galleryIds.length > 0) {
    const images = await legacyDb
      .select({ id: media.id, url: media.url, alt: media.alt })
      .from(media)
      .where(inArray(media.id, galleryIds));
    gallery = galleryIds
      .map((gid) => images.find((img) => img.id === gid))
      .filter(Boolean) as typeof gallery;
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    content: row.content,
    composition: row.composition,
    usageInstructions: row.usageInstructions,
    whoCanUse: row.whoCanUse,
    benefits: row.benefits,
    differentials: row.differentials,
    faq: row.faq,
    brand: row.brand,
    isKit: row.isKit,
    featured: row.featured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    publishedAt: row.publishedAt,
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    image: row.image
      ? { url: row.image.url, alt: row.image.alt, cardUrl: row.image.cardUrl, heroUrl: row.image.heroUrl }
      : null,
    gallery,
  });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase primary for single product ─────────────────────────────────────

async function productBySlugFromSupabase(
  tenantId: number,
  slug: string,
): Promise<NextResponse | null> {
  const config = getCachedSyncConfig(tenantId, "produtos");
  if (!config) return null;

  const result = await querySupabase(config.supabaseTable, {
    filters: { slug: `eq.${slug}`, status: "eq.published" },
    limit: 1,
  });

  if (!result || result.data.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const row = result.data[0] as Record<string, any>;

  // Wrap raw content in TipTap format for the storefront renderer
  const rawContent = row.content;
  const content = typeof rawContent === "string" ? { type: "doc", _html: rawContent } : rawContent;

  return NextResponse.json({
    id: row.id,
    name: row.title || row.name || null,
    slug: row.slug,
    description: row.excerpt || row.description || null,
    content,
    composition: row.composition || null,
    usageInstructions: row.usage_instructions || null,
    whoCanUse: row.who_can_use || null,
    benefits: row.benefits || null,
    differentials: row.differentials || null,
    faq: row.faq || null,
    brand: row.brand || null,
    isKit: row.is_kit || false,
    featured: row.featured || false,
    seoTitle: row.meta_title || null,
    seoDescription: row.meta_description || null,
    publishedAt: row.published_at || row.published_date || row.created_at,
    category: null,
    image: row.cover_image_url
      ? { url: row.cover_image_url, alt: row.cover_image_alt || row.title || "", cardUrl: null, heroUrl: null }
      : row.embalagem_mockup
        ? { url: row.embalagem_mockup, alt: row.title || "", cardUrl: null, heroUrl: null }
        : null,
    gallery: [],
    _fallback: "supabase",
  });
}
