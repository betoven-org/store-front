import { db } from "@brasa/core/db";
import {
  categories, authors, posts, tags, media, products, siteSettings, subscriptions,
} from "@brasa/core/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@brasa/core/slug";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import { getSbConfig } from "@/lib/supabase";

async function sbFetchUpdated<T>(table: string, since: string, orderCol = "updated_at"): Promise<T[]> {
  const { url, key } = await getSbConfig();
  const all: T[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const filter = `${orderCol}=gt.${since}`;
    const res = await fetch(
      `${url}/${table}?${filter}&offset=${offset}&limit=${limit}&order=${orderCol}.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`);
    const rows = (await res.json()) as T[];
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }
  return all;
}

// ── Types ───────────────────────────────────────────────────────────────────────

type SbCategory = { id: string; name: string; slug: string; description: string | null; created_at: string; updated_at: string };
type SbTag = { id: string; name: string; slug: string };
type SbArticle = {
  id: string; title: string; slug: string; excerpt: string | null; content: string | null;
  cover_image_url: string | null; cover_image_alt: string | null; published_date: string | null;
  author_name: string | null; category_id: string | null; meta_title: string | null;
  meta_description: string | null; focus_keyword: string | null; secondary_keywords: string | null;
  og_title: string | null; og_description: string | null; og_image_url: string | null;
  schema_type: string | null; canonical_url: string | null;
  word_count: number | null; reading_time_minutes: number | null;
  seo_score: number | null; seo_notes: string | null; last_seo_review_at: string | null;
  status: string; created_at: string; updated_at: string;
  published_at: string | null; approved_at: string | null;
};
type SbArticleTag = { article_id: string; tag_id: string };
type SbProduct = {
  id: string; title: string; slug: string; excerpt: string | null; content: string | null;
  cover_image_url: string | null; cover_image_alt: string | null; author_name: string | null;
  category_id: string | null; meta_title: string | null; meta_description: string | null;
  focus_keyword: string | null; word_count: number | null; reading_time_minutes: number | null;
  status: string; created_at: string; updated_at: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function getOrCreateMedia(url: string, alt: string, tenantId: number): Promise<number> {
  const [existing] = await db.select({ id: media.id }).from(media).where(and(eq(media.supabaseUrl, url), eq(media.tenantId, tenantId))).limit(1);
  if (existing) return existing.id;
  const filename = url.split("/").pop() || "image";
  const [created] = await db.insert(media).values({ supabaseUrl: url, filename, alt, url, tenantId, createdAt: new Date().toISOString() }).returning({ id: media.id });
  return created.id;
}

async function getOrCreateAuthor(name: string, tenantId: number): Promise<number> {
  const slug = generateSlug(name);
  const [existing] = await db.select({ id: authors.id }).from(authors).where(and(eq(authors.slug, slug), eq(authors.tenantId, tenantId))).limit(1);
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const [created] = await db.insert(authors).values({ name, slug, tenantId, createdAt: now, updatedAt: now }).returning({ id: authors.id });
  return created.id;
}

async function getCategoryMap(tenantId: number): Promise<Map<string, number>> {
  const rows = await db.select({ id: categories.id, supabaseId: categories.supabaseId }).from(categories).where(eq(categories.tenantId, tenantId));
  const map = new Map<string, number>();
  for (const r of rows) if (r.supabaseId) map.set(r.supabaseId, r.id);
  return map;
}

// ── Cron handler ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const tenantId = await getTenantId();

    // Block sync if subscription is suspended
    const [sub] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (sub?.status === "suspended") {
      return NextResponse.json(
        { error: "Assinatura suspensa — sincronizacao bloqueada" },
        { status: 402 },
      );
    }

    // Read last sync timestamp
    const [settings] = await db.select({ lastSyncAt: siteSettings.lastSyncAt }).from(siteSettings).where(eq(siteSettings.tenantId, tenantId)).limit(1);
    const since = settings?.lastSyncAt || "2000-01-01T00:00:00.000Z";
    const syncStart = new Date().toISOString();

    // Fetch only updated records from Supabase
    const [sbCategories, sbArticles, sbProducts] = await Promise.all([
      sbFetchUpdated<SbCategory>("categories", since, "created_at"),
      sbFetchUpdated<SbArticle>("articles", since),
      sbFetchUpdated<SbProduct>("products", since),
    ]);

    const totalChanged = sbCategories.length + sbArticles.length + sbProducts.length;
    if (totalChanged === 0) {
      return NextResponse.json({ synced: 0, message: "Nenhuma alteracao detectada" });
    }

    const now = new Date().toISOString();
    let catCreated = 0, catUpdated = 0;
    let postCreated = 0, postUpdated = 0;
    let prodCreated = 0, prodUpdated = 0;

    // ── Categories ──────────────────────────────────────────────────────────
    const catMap = await getCategoryMap(tenantId);
    for (const sc of sbCategories) {
      const existingId = catMap.get(sc.id);
      if (existingId) {
        await db.update(categories).set({ name: sc.name, slug: sc.slug, description: sc.description, updatedAt: now }).where(and(eq(categories.id, existingId), eq(categories.tenantId, tenantId)));
        catUpdated++;
      } else {
        const [row] = await db.insert(categories).values({ supabaseId: sc.id, name: sc.name, slug: sc.slug, description: sc.description, tenantId, createdAt: sc.created_at, updatedAt: now }).returning({ id: categories.id });
        catMap.set(sc.id, row.id);
        catCreated++;
      }
    }

    // ── Articles ────────────────────────────────────────────────────────────
    if (sbArticles.length > 0) {
      // Fetch tags for changed articles
      const { url, key } = await getSbConfig();
      const articleIds = sbArticles.map((a) => a.id);
      const tagRes = await fetch(
        `${url}/article_tags?article_id=in.(${articleIds.join(",")})`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const sbArticleTags: SbArticleTag[] = tagRes.ok ? await tagRes.json() : [];

      const tagListRes = await fetch(
        `${url}/tags?order=name.asc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const sbTags: SbTag[] = tagListRes.ok ? await tagListRes.json() : [];
      const tagNameMap = new Map<string, string>();
      for (const st of sbTags) tagNameMap.set(st.id, st.name);

      for (const sa of sbArticles) {
        const categoryId = sa.category_id ? catMap.get(sa.category_id) ?? null : null;
        const authorId = sa.author_name ? await getOrCreateAuthor(sa.author_name, tenantId) : null;
        let heroImageId: number | null = null;
        if (sa.cover_image_url) heroImageId = await getOrCreateMedia(sa.cover_image_url, sa.cover_image_alt || sa.title, tenantId);
        const content = sa.content ? { type: "doc", _html: sa.content } : null;
        const status: "draft" | "published" = sa.status === "published" ? "published" : "draft";

        const [existing] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.supabaseId, sa.id), eq(posts.tenantId, tenantId))).limit(1);
        const postData = {
          title: sa.title, slug: sa.slug, excerpt: sa.excerpt, content, categoryId, authorId,
          heroImageId, coverUrl: sa.cover_image_url, metaTitle: sa.meta_title,
          metaDescription: sa.meta_description, focusKeyword: sa.focus_keyword,
          secondaryKeywords: sa.secondary_keywords, ogTitle: sa.og_title,
          ogDescription: sa.og_description, ogImageUrl: sa.og_image_url,
          schemaType: sa.schema_type, canonicalUrl: sa.canonical_url,
          wordCount: sa.word_count, readingTimeMinutes: sa.reading_time_minutes,
          seoScore: sa.seo_score, seoNotes: sa.seo_notes,
          lastSeoReviewAt: sa.last_seo_review_at, approvedAt: sa.approved_at,
          status, publishedAt: sa.published_at || sa.published_date || null,
          updatedAt: sa.updated_at,
        };

        let localPostId: number;
        if (existing) {
          await db.update(posts).set(postData).where(and(eq(posts.id, existing.id), eq(posts.tenantId, tenantId)));
          localPostId = existing.id;
          postUpdated++;
        } else {
          const [row] = await db.insert(posts).values({
            supabaseId: sa.id, ...postData, tenantId, createdAt: sa.created_at,
          }).returning({ id: posts.id });
          localPostId = row.id;
          postCreated++;
        }

        // Re-sync tags for this post
        await db.delete(tags).where(and(eq(tags.postId, localPostId), eq(tags.tenantId, tenantId)));
        const postTags = sbArticleTags.filter((at) => at.article_id === sa.id);
        for (const at of postTags) {
          const tagName = tagNameMap.get(at.tag_id);
          if (tagName) await db.insert(tags).values({ postId: localPostId, tag: tagName, tenantId });
        }
      }
    }

    // ── Products ────────────────────────────────────────────────────────────
    for (const sp of sbProducts) {
      let imageId: number | null = null;
      if (sp.cover_image_url) imageId = await getOrCreateMedia(sp.cover_image_url, sp.cover_image_alt || sp.title, tenantId);
      const content = sp.content ? { type: "doc", _html: sp.content } : null;
      const status: "draft" | "published" = sp.status === "published" ? "published" : "draft";

      const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, sp.slug), eq(products.tenantId, tenantId))).limit(1);
      if (existing) {
        const updateData: Record<string, unknown> = {
          name: sp.title, description: sp.excerpt, content,
          seoTitle: sp.meta_title, seoDescription: sp.meta_description,
          status, updatedAt: sp.updated_at,
        };
        if (imageId) updateData.imageId = imageId;
        await db.update(products).set(updateData).where(and(eq(products.id, existing.id), eq(products.tenantId, tenantId)));
        prodUpdated++;
      } else {
        await db.insert(products).values({
          name: sp.title, slug: sp.slug, description: sp.excerpt, content, imageId,
          seoTitle: sp.meta_title, seoDescription: sp.meta_description,
          status, tenantId, createdAt: sp.created_at, updatedAt: sp.updated_at,
        });
        prodCreated++;
      }
    }

    // Update last sync timestamp
    await db.update(siteSettings).set({ lastSyncAt: syncStart }).where(eq(siteSettings.tenantId, tenantId));

    // Revalidate caches
    revalidateTag("posts");
    revalidateTag("categories");
    revalidateTag("products");

    const result = {
      synced: totalChanged,
      categories: { created: catCreated, updated: catUpdated },
      posts: { created: postCreated, updated: postUpdated },
      products: { created: prodCreated, updated: prodUpdated },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON supabase-sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no sync incremental" },
      { status: 500 }
    );
  }
}
