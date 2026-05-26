import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import {
  categories, authors, posts, tags, media, products, productCategories, subscribers,
} from "@brasa/core/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateSlug } from "@brasa/core/slug";
import { headers } from "next/headers";
import { siteSettings } from "@brasa/core/schema";

async function getSbConfig() {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const h = await headers();
    const tenantId = parseInt(h.get("x-tenant-id") || "1", 10);
    const [settings] = await db
      .select({ supabaseUrl: siteSettings.supabaseUrl, supabaseServiceRoleKey: siteSettings.supabaseServiceRoleKey })
      .from(siteSettings)
      .where(eq(siteSettings.tenantId, tenantId))
      .limit(1);
    if (settings?.supabaseUrl) url = settings.supabaseUrl;
    if (settings?.supabaseServiceRoleKey) key = settings.supabaseServiceRoleKey;
  }

  if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
  return { url: `${url}/rest/v1`, key };
}

async function sbFetchAll<T>(table: string, orderCol = "created_at"): Promise<T[]> {
  const { url, key } = await getSbConfig();
  const all: T[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${url}/${table}?offset=${offset}&limit=${limit}&order=${orderCol}.asc`,
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

type SbCategory = { id: string; name: string; slug: string; description: string | null; created_at: string };
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
type SbSubscriber = {
  id: string; name: string | null; email: string; active: boolean; created_at: string;
};

async function getOrCreateMedia(url: string, alt: string): Promise<number> {
  const [existing] = await db.select({ id: media.id }).from(media).where(eq(media.supabaseUrl, url)).limit(1);
  if (existing) return existing.id;
  const filename = url.split("/").pop() || "image";
  const [created] = await db.insert(media).values({ supabaseUrl: url, filename, alt, url, createdAt: new Date().toISOString() }).returning({ id: media.id });
  return created.id;
}

async function getOrCreateAuthor(name: string): Promise<number> {
  const slug = generateSlug(name);
  const [existing] = await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, slug)).limit(1);
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const [created] = await db.insert(authors).values({ name, slug, createdAt: now, updatedAt: now }).returning({ id: authors.id });
  return created.id;
}

// -- SSE Sync --

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Fetch from Supabase
        send({ step: "fetch", label: "Buscando dados do Supabase...", progress: 5 });

        const [sbCategories, sbTags, sbArticles, sbArticleTags, sbProducts, sbSubscribers] =
          await Promise.all([
            sbFetchAll<SbCategory>("categories"),
            sbFetchAll<SbTag>("tags"),
            sbFetchAll<SbArticle>("articles"),
            sbFetchAll<SbArticleTag>("article_tags", "article_id"),
            sbFetchAll<SbProduct>("products"),
            sbFetchAll<SbSubscriber>("newsletter_subscribers"),
          ]);

        const totalItems = sbCategories.length + sbArticles.length + sbProducts.length;
        send({ step: "fetch_done", label: `${totalItems} itens encontrados`, progress: 15 });

        const now = new Date().toISOString();
        let catCreated = 0, catUpdated = 0;
        let postCreated = 0, postUpdated = 0;
        let tagsCreated = 0;
        let prodCreated = 0, prodUpdated = 0;

        // Step 2: Categories
        send({ step: "categories", label: `Sincronizando ${sbCategories.length} categorias...`, progress: 20 });
        const catMap = new Map<string, number>();
        for (const sc of sbCategories) {
          const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.supabaseId, sc.id)).limit(1);
          if (existing) {
            await db.update(categories).set({ name: sc.name, slug: sc.slug, description: sc.description, updatedAt: now }).where(eq(categories.id, existing.id));
            catMap.set(sc.id, existing.id);
            catUpdated++;
          } else {
            const [row] = await db.insert(categories).values({ supabaseId: sc.id, name: sc.name, slug: sc.slug, description: sc.description, createdAt: sc.created_at, updatedAt: now }).returning({ id: categories.id });
            catMap.set(sc.id, row.id);
            catCreated++;
          }
        }
        send({ step: "categories_done", label: `Categorias: ${catCreated} novas, ${catUpdated} atualizadas`, progress: 30 });

        // Step 3: Posts
        send({ step: "posts", label: `Sincronizando ${sbArticles.length} posts...`, progress: 35 });
        const postMap = new Map<string, number>();
        for (let i = 0; i < sbArticles.length; i++) {
          const sa = sbArticles[i];
          const categoryId = sa.category_id ? catMap.get(sa.category_id) ?? null : null;
          const authorId = sa.author_name ? await getOrCreateAuthor(sa.author_name) : null;
          let heroImageId: number | null = null;
          if (sa.cover_image_url) heroImageId = await getOrCreateMedia(sa.cover_image_url, sa.cover_image_alt || sa.title);
          const content = sa.content ? { type: "doc", _html: sa.content } : null;
          const status: "draft" | "published" = sa.status === "published" ? "published" : "draft";

          const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.supabaseId, sa.id)).limit(1);
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

          if (existing) {
            await db.update(posts).set(postData).where(eq(posts.id, existing.id));
            postMap.set(sa.id, existing.id);
            postUpdated++;
          } else {
            const [row] = await db.insert(posts).values({
              supabaseId: sa.id, ...postData, createdAt: sa.created_at,
            }).returning({ id: posts.id });
            postMap.set(sa.id, row.id);
            postCreated++;
          }

          // Progress every 10 posts
          if ((i + 1) % 10 === 0 || i === sbArticles.length - 1) {
            const pct = 35 + Math.round(((i + 1) / sbArticles.length) * 30);
            send({ step: "posts_progress", label: `Posts: ${i + 1}/${sbArticles.length}`, progress: pct });
          }
        }
        send({ step: "posts_done", label: `Posts: ${postCreated} novos, ${postUpdated} atualizados`, progress: 65 });

        // Step 4: Tags
        send({ step: "tags", label: "Sincronizando tags...", progress: 70 });
        const tagNameMap = new Map<string, string>();
        for (const st of sbTags) tagNameMap.set(st.id, st.name);
        for (const [sbId, localId] of postMap) {
          await db.delete(tags).where(eq(tags.postId, localId));
          const postTags = sbArticleTags.filter((at) => at.article_id === sbId);
          for (const at of postTags) {
            const tagName = tagNameMap.get(at.tag_id);
            if (tagName) { await db.insert(tags).values({ postId: localId, tag: tagName }); tagsCreated++; }
          }
        }
        send({ step: "tags_done", label: `${tagsCreated} tags vinculadas`, progress: 75 });

        // Step 5: Products
        send({ step: "products", label: `Sincronizando ${sbProducts.length} produtos...`, progress: 78 });
        for (let i = 0; i < sbProducts.length; i++) {
          const sp = sbProducts[i];
          let imageId: number | null = null;
          if (sp.cover_image_url) imageId = await getOrCreateMedia(sp.cover_image_url, sp.cover_image_alt || sp.title);
          const content = sp.content ? { type: "doc", _html: sp.content } : null;
          const status: "draft" | "published" = sp.status === "published" ? "published" : "draft";

          const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, sp.slug)).limit(1);
          if (existing) {
            const updateData: Record<string, unknown> = {
              name: sp.title, description: sp.excerpt, content,
              seoTitle: sp.meta_title, seoDescription: sp.meta_description,
              status, updatedAt: sp.updated_at,
            };
            if (imageId) updateData.imageId = imageId;
            await db.update(products).set(updateData).where(eq(products.id, existing.id));
            prodUpdated++;
          } else {
            await db.insert(products).values({
              name: sp.title, slug: sp.slug, description: sp.excerpt, content, imageId,
              seoTitle: sp.meta_title, seoDescription: sp.meta_description,
              status, createdAt: sp.created_at, updatedAt: sp.updated_at,
            });
            prodCreated++;
          }

          if ((i + 1) % 10 === 0 || i === sbProducts.length - 1) {
            const pct = 78 + Math.round(((i + 1) / sbProducts.length) * 17);
            send({ step: "products_progress", label: `Produtos: ${i + 1}/${sbProducts.length}`, progress: pct });
          }
        }

        // Step 6: Newsletter Subscribers
        send({ step: "subscribers", label: `Sincronizando ${sbSubscribers.length} inscritos...`, progress: 96 });
        let subCreated = 0, subUpdated = 0;
        for (const ss of sbSubscribers) {
          const [existing] = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, ss.email)).limit(1);
          if (existing) {
            await db.update(subscribers).set({ name: ss.name, active: ss.active }).where(eq(subscribers.id, existing.id));
            subUpdated++;
          } else {
            await db.insert(subscribers).values({ name: ss.name, email: ss.email, active: ss.active, createdAt: ss.created_at });
            subCreated++;
          }
        }
        send({ step: "subscribers_done", label: `Inscritos: ${subCreated} novos, ${subUpdated} atualizados`, progress: 99 });

        send({
          step: "done", label: "Sincronizacao concluida", progress: 100,
          result: {
            categories: { created: catCreated, updated: catUpdated },
            posts: { created: postCreated, updated: postUpdated },
            tags: tagsCreated,
            products: { created: prodCreated, updated: prodUpdated },
            subscribers: { created: subCreated, updated: subUpdated },
          },
        });
      } catch (error) {
        send({ step: "error", label: error instanceof Error ? error.message : "Erro na sincronizacao", progress: -1 });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    await db.execute(sql`UPDATE site_settings SET logo_id = NULL, favicon_id = NULL`);
    await db.execute(sql`TRUNCATE TABLE tags, posts, categories, products, product_categories, authors, media RESTART IDENTITY CASCADE`);

    return NextResponse.json({ message: "Todos os dados de conteudo limpos" });
  } catch (error) {
    console.error("[DELETE /api/admin/supabase-sync]", error);
    return NextResponse.json({ error: "Erro ao limpar dados" }, { status: 500 });
  }
}
