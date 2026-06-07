import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import {
  categories, authors, posts, tags, media, products, productCategories, subscribers, subscriptions,
} from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { getTenantId } from "@/lib/tenant";

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

async function getCategoryLocalId(supabaseId: string, tenantId: number): Promise<number | null> {
  const [row] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.supabaseId, supabaseId), eq(categories.tenantId, tenantId))).limit(1);
  return row?.id ?? null;
}

// ── Auth ────────────────────────────────────────────────────────────────────────

function verifySecret(request: NextRequest): boolean {
  const header = request.headers.get("x-supabase-webhook-secret");
  if (!header) return false;
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  return !!secret && header === secret;
}

// ── Webhook payload ─────────────────────────────────────────────────────────────

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

// ── POST handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Webhook secret invalido" }, { status: 401 });
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
    const payload: WebhookPayload = await request.json();
    const { type, table, record, old_record } = payload;

    switch (table) {
      case "categories":
        await handleCategory(type, record, old_record, tenantId);
        revalidateTag("categories");
        break;

      case "articles":
        await handleArticle(type, record, old_record, tenantId);
        revalidateTag("posts");
        break;

      case "products":
        await handleProduct(type, record, old_record, tenantId);
        revalidateTag("products");
        break;

      case "article_tags":
        await handleArticleTag(type, record, old_record, tenantId);
        revalidateTag("posts");
        break;

      case "product_categories":
        await handleProductCategory(type, record, old_record, tenantId);
        revalidateTag("product-categories");
        break;

      case "newsletter_subscribers":
        await handleSubscriber(type, record, old_record, tenantId);
        break;

      default:
        return NextResponse.json({ ignored: true, table }, { status: 200 });
    }

    return NextResponse.json({ received: true, table, type });
  } catch (error) {
    console.error("[Webhook supabase-sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no webhook" },
      { status: 500 },
    );
  }
}

// ── Category handler ────────────────────────────────────────────────────────────

async function handleCategory(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  if (type === "DELETE") {
    const sbId = old_record?.id as string;
    if (!sbId) return;
    const [existing] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.supabaseId, sbId), eq(categories.tenantId, tenantId))).limit(1);
    if (existing) await db.delete(categories).where(and(eq(categories.id, existing.id), eq(categories.tenantId, tenantId)));
    return;
  }

  if (!record) return;
  const sbId = record.id as string;
  const now = new Date().toISOString();

  const [existing] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.supabaseId, sbId), eq(categories.tenantId, tenantId))).limit(1);
  if (existing) {
    await db.update(categories).set({
      name: record.name as string,
      slug: record.slug as string,
      description: (record.description as string) || null,
      updatedAt: now,
    }).where(and(eq(categories.id, existing.id), eq(categories.tenantId, tenantId)));
  } else {
    await db.insert(categories).values({
      supabaseId: sbId,
      name: record.name as string,
      slug: record.slug as string,
      description: (record.description as string) || null,
      tenantId,
      createdAt: (record.created_at as string) || now,
      updatedAt: now,
    });
  }
}

// ── Article handler ─────────────────────────────────────────────────────────────

async function handleArticle(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  if (type === "DELETE") {
    const sbId = old_record?.id as string;
    if (!sbId) return;
    const [existing] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.supabaseId, sbId), eq(posts.tenantId, tenantId))).limit(1);
    if (existing) {
      await db.delete(tags).where(and(eq(tags.postId, existing.id), eq(tags.tenantId, tenantId)));
      await db.delete(posts).where(and(eq(posts.id, existing.id), eq(posts.tenantId, tenantId)));
    }
    return;
  }

  if (!record) return;
  const sbId = record.id as string;
  const categoryId = record.category_id ? await getCategoryLocalId(record.category_id as string, tenantId) : null;
  const authorId = record.author_name ? await getOrCreateAuthor(record.author_name as string, tenantId) : null;
  let heroImageId: number | null = null;
  if (record.cover_image_url) {
    heroImageId = await getOrCreateMedia(
      record.cover_image_url as string,
      (record.cover_image_alt as string) || (record.title as string),
      tenantId,
    );
  }
  const content = record.content ? { type: "doc", _html: record.content as string } : null;
  const status: "draft" | "published" = record.status === "published" ? "published" : "draft";

  const postData = {
    title: record.title as string,
    slug: record.slug as string,
    excerpt: (record.excerpt as string) || null,
    content,
    categoryId,
    authorId,
    heroImageId,
    coverUrl: (record.cover_image_url as string) || null,
    metaTitle: (record.meta_title as string) || null,
    metaDescription: (record.meta_description as string) || null,
    focusKeyword: (record.focus_keyword as string) || null,
    secondaryKeywords: (record.secondary_keywords as string) || null,
    ogTitle: (record.og_title as string) || null,
    ogDescription: (record.og_description as string) || null,
    ogImageUrl: (record.og_image_url as string) || null,
    schemaType: (record.schema_type as string) || null,
    canonicalUrl: (record.canonical_url as string) || null,
    wordCount: (record.word_count as number) || null,
    readingTimeMinutes: (record.reading_time_minutes as number) || null,
    seoScore: (record.seo_score as number) || null,
    seoNotes: (record.seo_notes as string) || null,
    lastSeoReviewAt: (record.last_seo_review_at as string) || null,
    approvedAt: (record.approved_at as string) || null,
    status,
    publishedAt: (record.published_at as string) || (record.published_date as string) || null,
    updatedAt: (record.updated_at as string) || new Date().toISOString(),
  };

  const [existing] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.supabaseId, sbId), eq(posts.tenantId, tenantId))).limit(1);
  if (existing) {
    await db.update(posts).set(postData).where(and(eq(posts.id, existing.id), eq(posts.tenantId, tenantId)));
  } else {
    await db.insert(posts).values({
      supabaseId: sbId,
      ...postData,
      tenantId,
      createdAt: (record.created_at as string) || new Date().toISOString(),
    });
  }
}

// ── Product handler ─────────────────────────────────────────────────────────────

async function handleProduct(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  if (type === "DELETE") {
    const slug = old_record?.slug as string;
    if (!slug) return;
    const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, slug), eq(products.tenantId, tenantId))).limit(1);
    if (existing) await db.delete(products).where(and(eq(products.id, existing.id), eq(products.tenantId, tenantId)));
    return;
  }

  if (!record) return;
  let imageId: number | null = null;
  if (record.cover_image_url) {
    imageId = await getOrCreateMedia(
      record.cover_image_url as string,
      (record.cover_image_alt as string) || (record.title as string),
      tenantId,
    );
  }
  const content = record.content ? { type: "doc", _html: record.content as string } : null;
  const status: "draft" | "published" = record.status === "published" ? "published" : "draft";

  const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, record.slug as string), eq(products.tenantId, tenantId))).limit(1);
  if (existing) {
    const updateData: Record<string, unknown> = {
      name: record.title as string,
      description: (record.excerpt as string) || null,
      content,
      seoTitle: (record.meta_title as string) || null,
      seoDescription: (record.meta_description as string) || null,
      faq: record.faq ?? null,
      status,
      updatedAt: (record.updated_at as string) || new Date().toISOString(),
    };
    if (imageId) updateData.imageId = imageId;
    await db.update(products).set(updateData).where(and(eq(products.id, existing.id), eq(products.tenantId, tenantId)));
  } else {
    await db.insert(products).values({
      name: record.title as string,
      slug: record.slug as string,
      description: (record.excerpt as string) || null,
      content,
      imageId,
      seoTitle: (record.meta_title as string) || null,
      seoDescription: (record.meta_description as string) || null,
      faq: record.faq ?? null,
      status,
      tenantId,
      createdAt: (record.created_at as string) || new Date().toISOString(),
      updatedAt: (record.updated_at as string) || new Date().toISOString(),
    });
  }
}

// ── ArticleTag handler ──────────────────────────────────────────────────────────

async function handleArticleTag(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  const data = type === "DELETE" ? old_record : record;
  if (!data) return;

  const articleSbId = data.article_id as string;
  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.supabaseId, articleSbId), eq(posts.tenantId, tenantId))).limit(1);
  if (!post) return;

  // Fetch tag name from Supabase
  let sbConfig;
  try {
    const { getSbConfig } = await import("@/lib/supabase");
    sbConfig = await getSbConfig();
  } catch { return; }

  const tagId = data.tag_id as string;
  const res = await fetch(`${sbConfig.url.replace("/rest/v1", "")}/rest/v1/tags?id=eq.${tagId}&select=name&limit=1`, {
    headers: { apikey: sbConfig.key, Authorization: `Bearer ${sbConfig.key}` },
  });
  if (!res.ok) return;
  const tagRows = await res.json();
  const tagName = tagRows[0]?.name;
  if (!tagName) return;

  if (type === "DELETE") {
    // Remove specific tag
    const existingTags = await db.select({ id: tags.id, tag: tags.tag }).from(tags).where(and(eq(tags.postId, post.id), eq(tags.tenantId, tenantId)));
    const toDelete = existingTags.find((t) => t.tag === tagName);
    if (toDelete) await db.delete(tags).where(and(eq(tags.id, toDelete.id), eq(tags.tenantId, tenantId)));
  } else {
    // Add tag (avoid duplicate)
    const existingTags = await db.select({ tag: tags.tag }).from(tags).where(and(eq(tags.postId, post.id), eq(tags.tenantId, tenantId)));
    if (!existingTags.some((t) => t.tag === tagName)) {
      await db.insert(tags).values({ postId: post.id, tag: tagName, tenantId });
    }
  }
}

// ── ProductCategory handler ─────────────────────────────────────────────────

async function handleProductCategory(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  if (type === "DELETE") {
    const slug = old_record?.slug as string;
    if (!slug) return;
    await db.delete(productCategories).where(and(eq(productCategories.slug, slug), eq(productCategories.tenantId, tenantId)));
    return;
  }

  if (!record) return;
  const slug = record.slug as string;
  const now = new Date().toISOString();

  let imageId: number | null = null;
  if (record.image_url) {
    imageId = await getOrCreateMedia(
      record.image_url as string,
      (record.name as string) || "Categoria",
      tenantId,
    );
  }

  const data = {
    name: record.name as string,
    description: (record.description as string) || null,
    sortOrder: (record.sort_order as number) || 0,
    imageId,
    updatedAt: now,
  };

  const [existing] = await db.select({ id: productCategories.id }).from(productCategories).where(and(eq(productCategories.slug, slug), eq(productCategories.tenantId, tenantId))).limit(1);
  if (existing) {
    await db.update(productCategories).set(data).where(and(eq(productCategories.id, existing.id), eq(productCategories.tenantId, tenantId)));
  } else {
    await db.insert(productCategories).values({
      ...data,
      slug,
      tenantId,
      createdAt: (record.created_at as string) || now,
    });
  }
}

// ── Subscriber handler ──────────────────────────────────────────────────────────

async function handleSubscriber(
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null,
  tenantId: number,
) {
  if (type === "DELETE") {
    const email = old_record?.email as string;
    if (!email) return;
    await db.delete(subscribers).where(and(eq(subscribers.email, email), eq(subscribers.tenantId, tenantId)));
    return;
  }

  if (!record) return;
  const email = record.email as string;
  const name = (record.name as string) || null;
  const active = record.active !== false;

  const [existing] = await db.select({ id: subscribers.id }).from(subscribers).where(and(eq(subscribers.email, email), eq(subscribers.tenantId, tenantId))).limit(1);
  if (existing) {
    await db.update(subscribers).set({ name, active }).where(and(eq(subscribers.id, existing.id), eq(subscribers.tenantId, tenantId)));
  } else {
    await db.insert(subscribers).values({
      name,
      email,
      active,
      tenantId,
      createdAt: (record.created_at as string) || new Date().toISOString(),
    });
  }
}
