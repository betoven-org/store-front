import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { posts, products } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * POST /api/admin/integrations/search/sync — Sync content to Algolia/Typesense
 * Pushes all published posts and products to the search engine index.
 *
 * Supports: Algolia (ALGOLIA_APP_ID + ALGOLIA_API_KEY + ALGOLIA_INDEX)
 *           Typesense (TYPESENSE_HOST + TYPESENSE_API_KEY + TYPESENSE_COLLECTION)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const provider = detectProvider();

  if (!provider) {
    return NextResponse.json(
      { error: "Nenhum provider de search configurado. Configure ALGOLIA_* ou TYPESENSE_* nas env vars." },
      { status: 400 },
    );
  }

  // Fetch all published content
  const [allPosts, allProducts] = await Promise.all([
    db.query.posts.findMany({
      where: eq(posts.tenantId, tenantId),
      with: { category: true, author: true },
    }),
    db.query.products.findMany({
      where: eq(products.tenantId, tenantId),
      with: { image: true },
    }),
  ]);

  const records = [
    ...allPosts.map((p) => ({
      objectID: `post_${p.id}`,
      type: "post",
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      category: p.category?.name || null,
      author: p.author?.name || null,
      publishedAt: p.publishedAt,
      status: p.status,
    })),
    ...allProducts.map((p) => ({
      objectID: `product_${p.id}`,
      type: "product",
      title: p.name,
      slug: p.slug,
      description: p.description,
      image: p.image?.url || null,
      status: p.status,
    })),
  ];

  try {
    if (provider.type === "algolia") {
      await syncAlgolia(records, provider);
    } else {
      await syncTypesense(records, provider);
    }

    return NextResponse.json({ synced: records.length, provider: provider.type });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no sync" },
      { status: 500 },
    );
  }
}

type AlgoliaConfig = { type: "algolia"; appId: string; apiKey: string; index: string };
type TypesenseConfig = { type: "typesense"; host: string; apiKey: string; collection: string };

function detectProvider(): AlgoliaConfig | TypesenseConfig | null {
  if (process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY) {
    return {
      type: "algolia",
      appId: process.env.ALGOLIA_APP_ID,
      apiKey: process.env.ALGOLIA_API_KEY,
      index: process.env.ALGOLIA_INDEX || "content",
    };
  }
  if (process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY) {
    return {
      type: "typesense",
      host: process.env.TYPESENSE_HOST,
      apiKey: process.env.TYPESENSE_API_KEY,
      collection: process.env.TYPESENSE_COLLECTION || "content",
    };
  }
  return null;
}

async function syncAlgolia(records: any[], config: AlgoliaConfig) {
  const res = await fetch(
    `https://${config.appId}-dsn.algolia.net/1/indexes/${config.index}/batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": config.appId,
        "X-Algolia-API-Key": config.apiKey,
      },
      body: JSON.stringify({
        requests: records.map((r) => ({ action: "updateObject", body: r })),
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Algolia retornou ${res.status}`);
  }
}

async function syncTypesense(records: any[], config: TypesenseConfig) {
  // Typesense uses JSONL for batch import
  const jsonl = records.map((r) => JSON.stringify(r)).join("\n");

  const res = await fetch(
    `${config.host}/collections/${config.collection}/documents/import?action=upsert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-TYPESENSE-API-KEY": config.apiKey,
      },
      body: jsonl,
    },
  );

  if (!res.ok) {
    throw new Error(`Typesense retornou ${res.status}`);
  }
}
