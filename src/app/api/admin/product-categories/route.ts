import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { productCategories, media } from "@brasa/core/schema";
import { and, eq, count, asc, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, createProductCategorySchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenantId = await getTenantId();
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const parentOnly = searchParams.get("parentOnly") === "true";
    const whereClause = parentOnly
      ? and(isNull(productCategories.parentId), eq(productCategories.tenantId, tenantId))
      : eq(productCategories.tenantId, tenantId);

    const [docs, totalResult] = await Promise.all([
      db
        .select({
          id: productCategories.id,
          name: productCategories.name,
          slug: productCategories.slug,
          description: productCategories.description,
          imageId: productCategories.imageId,
          imageUrl: media.url,
          sortOrder: productCategories.sortOrder,
          createdAt: productCategories.createdAt,
        })
        .from(productCategories)
        .leftJoin(media, eq(productCategories.imageId, media.id))
        .where(whereClause)
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(productCategories).where(whereClause),
    ]);

    const totalDocs = totalResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return NextResponse.json({ docs, totalDocs, totalPages, page });
  } catch (error) {
    console.error("[GET /api/admin/product-categories]", error);
    return NextResponse.json({ error: "Erro ao listar categorias de produto" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenantId = await getTenantId();
    const body = await req.json();
    const parsed = parseBody(createProductCategorySchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, description, imageId, sortOrder } = parsed.data;

    const slug = generateSlug(name);

    const [existing] = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.slug, slug), eq(productCategories.tenantId, tenantId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Ja existe uma categoria de produto com esse slug" }, { status: 409 });
    }

    const now = new Date().toISOString();

    const [created] = await db
      .insert(productCategories)
      .values({
        name,
        slug,
        description: description || null,
        parentId: null,
        imageId: imageId || null,
        sortOrder: sortOrder ?? 0,
        tenantId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    revalidateTag("product-categories");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/product-categories]", error);
    return NextResponse.json({ error: "Erro ao criar categoria de produto" }, { status: 500 });
  }
}
