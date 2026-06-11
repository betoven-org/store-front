import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionItems } from "@/db/schema";
import { eq, and, desc, asc, isNull, sql, ilike } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
    // A UI manda `page` (1-based); `offset` continua suportado como fallback
    const pageParam = url.searchParams.get("page");
    const offset = pageParam
      ? (Math.max(Number(pageParam) || 1, 1) - 1) * limit
      : Number(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") || "createdAt:desc";

    // Build conditions
    const conditions = [
      eq(collectionItems.collectionId, collectionId),
      eq(collectionItems.tenantId, tenantId),
      isNull(collectionItems.deletedAt),
    ];

    if (status === "draft" || status === "published") {
      conditions.push(eq(collectionItems.status, status));
    }

    if (search) {
      conditions.push(ilike(collectionItems.slug, `%${search}%`));
    }

    const where = and(...conditions)!;

    // Parse sort
    const [sortField, sortDir] = sort.split(":");
    const sortColumn =
      sortField === "slug"
        ? collectionItems.slug
        : sortField === "updatedAt"
          ? collectionItems.updatedAt
          : sortField === "publishedAt"
            ? collectionItems.publishedAt
            : collectionItems.createdAt;
    const orderBy = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(collectionItems)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(collectionItems)
        .where(where),
    ]);

    return NextResponse.json({
      docs: items,
      total: Number(countResult[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Collection items list error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar itens" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Verify collection belongs to tenant
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();
    const { slug, data, status, featured } = body;

    if (!slug || !data) {
      return NextResponse.json(
        { error: "slug e data sao obrigatorios" },
        { status: 400 }
      );
    }

    const normalized = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const now = new Date().toISOString();
    const itemStatus = status === "published" ? "published" : "draft";

    const [created] = await db
      .insert(collectionItems)
      .values({
        tenantId,
        collectionId,
        slug: normalized,
        data,
        status: itemStatus,
        featured: featured ?? false,
        publishedAt: itemStatus === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Ja existe um item com esse slug nesta colecao" },
        { status: 409 }
      );
    }
    console.error("Collection item create error:", error);
    return NextResponse.json(
      { error: "Erro ao criar item" },
      { status: 500 }
    );
  }
}
