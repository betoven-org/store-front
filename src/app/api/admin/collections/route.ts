import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { eq, and, asc, sql, isNull } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const tenantId = await getTenantId();

    const rows = await db
      .select({
        id: collections.id,
        tenantId: collections.tenantId,
        name: collections.name,
        slug: collections.slug,
        icon: collections.icon,
        source: collections.source,
        syncConfig: collections.syncConfig,
        pageSlugPattern: collections.pageSlugPattern,
        pageSections: collections.pageSections,
        pageDraftSections: collections.pageDraftSections,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        fieldCount: sql<number>`(SELECT count(*) FROM collection_fields WHERE collection_id = ${collections.id})`.as("field_count"),
        itemCount: sql<number>`(SELECT count(*) FROM collection_items WHERE collection_id = ${collections.id} AND deleted_at IS NULL)`.as("item_count"),
      })
      .from(collections)
      .where(eq(collections.tenantId, tenantId))
      .orderBy(asc(collections.name));

    return NextResponse.json({ docs: rows });
  } catch (error) {
    console.error("Collections list error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colecoes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const { name, slug, icon, source, syncConfig } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name e slug sao obrigatorios" },
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
    const [created] = await db
      .insert(collections)
      .values({
        tenantId,
        name,
        slug: normalized,
        icon: icon || null,
        source: source || "local",
        syncConfig: syncConfig || null,
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
        { error: "Ja existe uma colecao com esse slug" },
        { status: 409 }
      );
    }
    console.error("Collection create error:", error);
    return NextResponse.json(
      { error: "Erro ao criar colecao" },
      { status: 500 }
    );
  }
}
