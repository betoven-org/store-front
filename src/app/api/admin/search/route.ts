import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { posts, categories, authors, products } from "@brasa/core/schema";
import { and, ilike, desc, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tenantId = await getTenantId();
  const pattern = `%${q}%`;

  const [foundPosts, foundCategories, foundAuthors, foundProducts] =
    await Promise.all([
      db
        .select({ id: posts.id, title: posts.title, slug: posts.slug, status: posts.status })
        .from(posts)
        .where(and(ilike(posts.title, pattern), eq(posts.tenantId, tenantId)))
        .orderBy(desc(posts.createdAt))
        .limit(5),
      db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories)
        .where(and(ilike(categories.name, pattern), eq(categories.tenantId, tenantId)))
        .orderBy(desc(categories.createdAt))
        .limit(5),
      db
        .select({ id: authors.id, name: authors.name, slug: authors.slug })
        .from(authors)
        .where(and(ilike(authors.name, pattern), eq(authors.tenantId, tenantId)))
        .orderBy(desc(authors.createdAt))
        .limit(5),
      db
        .select({ id: products.id, name: products.name, slug: products.slug })
        .from(products)
        .where(and(ilike(products.name, pattern), eq(products.tenantId, tenantId)))
        .orderBy(desc(products.createdAt))
        .limit(5),
    ]);

  const results = [
    ...foundPosts.map((p) => ({
      type: "post" as const,
      id: p.id,
      label: p.title,
      href: `/admin/posts/${p.id}`,
      meta: p.status,
    })),
    ...foundCategories.map((c) => ({
      type: "category" as const,
      id: c.id,
      label: c.name,
      href: `/admin/categorias/${c.id}`,
    })),
    ...foundAuthors.map((a) => ({
      type: "author" as const,
      id: a.id,
      label: a.name,
      href: `/admin/autores/${a.id}`,
    })),
    ...foundProducts.map((p) => ({
      type: "product" as const,
      id: p.id,
      label: p.name,
      href: `/admin/produtos/${p.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
