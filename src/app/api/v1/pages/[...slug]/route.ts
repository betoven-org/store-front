import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { pages, tenants } from "@brasa/core/schema";
import { db as appDb } from "@/db";
import { collections, collectionItems, collectionFields } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { BrasaManifest, SectionBlock } from "@brasa/core/manifest";
import { resolveSections } from "@/lib/loaders/resolver";
import { getCommerceAdapterAsync } from "@/lib/commerce";
import {
  isNeonDown, isNeonConnectionError, markNeonDown,
  getCachedSyncConfig, cacheSyncConfig, type CachedSyncConfig,
  querySupabase, mapSupabaseRow,
} from "@/lib/neon-fallback";

// ── Resolve {{field}} bindings in sections with collection item data ────────

function resolveBindings(section: any, itemData: Record<string, any>): any {
  if (typeof section === "string") {
    return section.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
      const keys = path.split(".");
      let val: any = itemData;
      for (const k of keys) {
        if (val == null) return "";
        val = val[k];
      }
      return val != null ? String(val) : "";
    });
  }
  if (Array.isArray(section)) {
    return section.map((s) => resolveBindings(s, itemData));
  }
  if (section && typeof section === "object") {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(section)) {
      resolved[key] = resolveBindings(value, itemData);
    }
    return resolved;
  }
  return section;
}

// ── Match a slug against a collection's pageSlugPattern ─────────────────────
// Pattern: "blog/{slug}" matches "blog/my-post" → itemSlug = "my-post"

function matchPattern(pattern: string, slug: string): string | null {
  // Normalize: remove leading/trailing slashes
  const p = pattern.replace(/^\/|\/$/g, "");
  const s = slug.replace(/^\/|\/$/g, "");

  // Split into segments
  const patternParts = p.split("/");
  const slugParts = s.split("/");

  if (patternParts.length !== slugParts.length) return null;

  let itemSlug: string | null = null;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "{slug}") {
      itemSlug = slugParts[i];
    } else if (patternParts[i] !== slugParts[i]) {
      return null;
    }
  }
  return itemSlug;
}

// ── Resolve deco.cx __resolveType references in section props ────────────────
// Converts deco loader references (e.g. vtex/loaders/intelligentSearch/productList.ts)
// into actual VTEX API calls using our commerce adapter.

async function resolveDecoRefs(sections: any[], tenantId: number): Promise<any[]> {
  const adapter = await getCommerceAdapterAsync(tenantId);
  if (!adapter) return sections;

  return Promise.all(sections.map(async (section) => {
    if (!section?.props) return section;

    const resolvedProps = { ...section.props };

    for (const [key, val] of Object.entries(resolvedProps)) {
      if (!val || typeof val !== "object" || !(val as any).__resolveType) continue;

      const ref = val as { __resolveType: string; props?: Record<string, any> };
      const loaderProps = ref.props || {};

      try {
        if (ref.__resolveType.includes("productList")) {
          const result = await adapter.searchProducts({
            query: loaderProps.term || loaderProps.query || "",
            category: loaderProps.category,
            limit: (loaderProps.count || 12) + 10, // fetch extra to compensate for filtering
            sort: loaderProps.sort || "",
          });
          // Filter out unavailable products (price = 0 or no InStock offer)
          const available = (result.products || []).filter((p: any) => {
            const price = p.offers?.lowPrice;
            const hasStock = p.offers?.offers?.some((o: any) => o.availability === "InStock" && o.price > 0);
            return price > 0 || hasStock;
          });
          resolvedProps[key] = available.slice(0, loaderProps.count || 12);
        } else if (ref.__resolveType.includes("productDetailsPage")) {
          // Skip — resolved at PDP level
          resolvedProps[key] = null;
        } else {
          // Unknown loader — leave as-is
        }
      } catch (err) {
        console.error(`[resolveDecoRefs] Failed ${ref.__resolveType}:`, err);
        resolvedProps[key] = null;
      }
    }

    return { ...section, props: resolvedProps };
  }));
}

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const slugParts = params.slug as string | string[];
  const slug = Array.isArray(slugParts) ? slugParts.join("/") : slugParts;

  // ── Supabase shortcut when Neon is known down ─────────────────────────
  if (isNeonDown()) {
    const fb = await pagesFallback(tenantId, slug, draft);
    if (fb) return fb;
  }

  try {
  // ── 1. Try exact page match ─────────────────────────────────────────────
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug), isNull(pages.deletedAt)))
    .limit(1);

  // Fetch global sections and manifest (used by both page and collection detail)
  const [tenant] = await db
    .select({ globalSections: tenants.globalSections, manifest: tenants.manifest })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const globals = tenant?.globalSections as { header?: any; footer?: any } | null;
  const manifest = (tenant?.manifest || { sections: [] }) as BrasaManifest;

  if (page) {
    const pageSections = (draft ? (page.draftSections ?? page.sections) : page.sections) as SectionBlock[] | null;
    const filteredSections = (pageSections ?? []).filter(
      (s) => s?.component !== "Header" && s?.component !== "Footer"
    );

    // Resolve loaders for sections that declare them
    const resolved = await resolveSections(filteredSections, manifest, { tenantId });

    // Resolve deco.cx __resolveType references (migrated pages from deco)
    const fullyResolved = await resolveDecoRefs(resolved, tenantId);

    const sections = [
      ...(globals?.header ? [globals.header] : []),
      ...fullyResolved,
      ...(globals?.footer ? [globals.footer] : []),
    ];

    return NextResponse.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      ogImageUrl: page.ogImageUrl,
      sections,
    });
  }

  // ── 2. Try collection detail page match ─────────────────────────────────
  // Find collections with a pageSlugPattern that matches this slug
  const allCollections = await appDb
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      pageSlugPattern: collections.pageSlugPattern,
      pageSections: collections.pageSections,
      pageDraftSections: collections.pageDraftSections,
      source: collections.source,
      syncConfig: collections.syncConfig,
    })
    .from(collections)
    .where(and(eq(collections.tenantId, tenantId), sql`${collections.pageSlugPattern} IS NOT NULL`));

  for (const col of allCollections) {
    // Cache sync config for Supabase fallback
    if (col.source === "synced" && col.syncConfig) {
      cacheSyncConfig(tenantId, col.slug, col.syncConfig as CachedSyncConfig);
    }

    const itemSlug = matchPattern(col.pageSlugPattern!, slug);
    if (itemSlug === null) continue;

    // Found a matching collection — fetch the item
    const item = await appDb.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.collectionId, col.id),
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.slug, itemSlug),
        isNull(collectionItems.deletedAt),
        draft ? undefined : eq(collectionItems.status, "published"),
      ),
    });

    if (!item) continue;

    const itemData = (item.data ?? {}) as Record<string, any>;

    // Get the page template sections
    const templateSections = (draft
      ? (col.pageDraftSections ?? col.pageSections)
      : col.pageSections) as any[] | null;

    if (!templateSections || templateSections.length === 0) {
      // No template — return item data as-is (for API-only usage)
      return NextResponse.json({
        id: item.id,
        slug: item.slug,
        title: itemData.title || item.slug,
        metaTitle: itemData.meta_title || itemData.title || null,
        metaDescription: itemData.meta_description || itemData.excerpt || null,
        ogTitle: itemData.og_title || itemData.title || null,
        ogDescription: itemData.og_description || itemData.excerpt || null,
        ogImageUrl: itemData.og_image_url || itemData.hero_image || itemData.image || null,
        sections: [
          ...(globals?.header ? [globals.header] : []),
          ...(globals?.footer ? [globals.footer] : []),
        ],
        collection: { name: col.name, slug: col.slug },
        item: itemData,
      });
    }

    // Resolve {{field}} bindings in template sections
    const boundSections = resolveBindings(templateSections, itemData) as SectionBlock[];
    const filteredSections = boundSections.filter(
      (s) => s?.component !== "Header" && s?.component !== "Footer"
    );

    // Resolve loaders for sections that declare them
    const resolved = await resolveSections(filteredSections, manifest, { tenantId });

    const sections = [
      ...(globals?.header ? [globals.header] : []),
      ...resolved,
      ...(globals?.footer ? [globals.footer] : []),
    ];

    return NextResponse.json({
      id: item.id,
      slug: item.slug,
      title: itemData.title || item.slug,
      metaTitle: itemData.meta_title || itemData.title || null,
      metaDescription: itemData.meta_description || itemData.excerpt || null,
      ogTitle: itemData.og_title || itemData.title || null,
      ogDescription: itemData.og_description || itemData.excerpt || null,
      ogImageUrl: itemData.og_image_url || itemData.hero_image || itemData.image || null,
      sections,
      collection: { name: col.name, slug: col.slug },
      item: itemData,
    });
  }

  return NextResponse.json({ error: "Page not found" }, { status: 404 });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    const fb = await pagesFallback(tenantId, slug, draft);
    if (fb) return fb;
    return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
  }
});

// ── Supabase fallback for pages (campanhas / collection detail pages) ────

async function pagesFallback(
  tenantId: number,
  slug: string,
  draft: boolean,
): Promise<NextResponse | null> {
  // Match slug as "{collectionSlug}/{itemSlug}" against cached sync configs
  const parts = slug.split("/");
  if (parts.length < 2) return null; // single-segment = regular page, no SB fallback

  const collectionSlug = parts[0];
  const itemSlug = parts.slice(1).join("/");

  const config = getCachedSyncConfig(tenantId, collectionSlug);
  if (!config) return null;

  const filters: Record<string, string> = { slug: `eq.${itemSlug}` };
  if (!draft) filters.status = "eq.published";

  const result = await querySupabase(config.supabaseTable, {
    filters,
    limit: 1,
  });

  if (!result || result.data.length === 0) return null;

  const row = result.data[0] as Record<string, unknown>;
  const hasFieldMap = Object.keys(config.fieldMap).length > 0;
  const data = hasFieldMap ? mapSupabaseRow(row, config.fieldMap) : { ...row };

  const title = (data.title as string) || (row.title as string) || itemSlug;

  return NextResponse.json({
    id: row.id,
    slug,
    title,
    metaTitle: (data.meta_title as string) || title,
    metaDescription: (data.meta_description as string) || (data.excerpt as string) || null,
    ogTitle: (data.og_title as string) || title,
    ogDescription: (data.og_description as string) || (data.excerpt as string) || null,
    ogImageUrl: (data.og_image_url as string) || (data.hero_image as string) || (data.image as string) || null,
    sections: [],
    collection: { name: collectionSlug, slug: collectionSlug },
    item: data,
    _fallback: "supabase",
  });
}
