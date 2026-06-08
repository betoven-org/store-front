import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { products, productCategories, media } from "@brasa/core/schema";
import { eq, desc, and, count, gte, lte, sql } from "drizzle-orm";
import { buildTsQuery } from "@brasa/core/search";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, createProductSchema } from "@brasa/core/validations";
import { notifyFrontend } from "@brasa/core/revalidate";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as "draft" | "published" | null;
    const categoryId = searchParams.get("category") || "";
    const featured = searchParams.get("featured") || "";
    const isKit = searchParams.get("isKit") || "";
    const showOnSite = searchParams.get("showOnSite") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const offset = (page - 1) * limit;
    const tenantId = session.user.tenantId;

    const conditions = [eq(products.tenantId, tenantId)];
    if (search) {
      const tsq = buildTsQuery(search);
      conditions.push(sql`(${products.searchVector} @@ ${tsq} OR similarity(${products.name}, ${search}) > 0.15)`);
    }
    if (status) {
      conditions.push(eq(products.status, status));
    }
    if (categoryId) {
      conditions.push(eq(products.productCategoryId, Number(categoryId)));
    }
    if (featured === "true" || featured === "false") {
      conditions.push(eq(products.featured, featured === "true"));
    }
    if (isKit === "true" || isKit === "false") {
      conditions.push(eq(products.isKit, isKit === "true"));
    }
    if (showOnSite === "true" || showOnSite === "false") {
      conditions.push(eq(products.showOnSite, showOnSite === "true"));
    }
    if (dateFrom) {
      conditions.push(gte(products.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(products.createdAt, `${dateTo}T23:59:59.999Z`));
    }

    const where = and(...conditions);

    const [docs, totalResult] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          status: products.status,
          featured: products.featured,
          publishedAt: products.publishedAt,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          productCategoryId: products.productCategoryId,
          categoryName: productCategories.name,
          imageId: products.imageId,
          imageUrl: media.url,
          galleryImages: products.galleryImages,
        })
        .from(products)
        .leftJoin(productCategories, eq(products.productCategoryId, productCategories.id))
        .leftJoin(media, eq(products.imageId, media.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    const totalDocs = totalResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalDocs / limit);

    return NextResponse.json({ docs, totalDocs, totalPages, page });
  } catch (error) {
    console.error("[GET /api/admin/products]", error);
    return NextResponse.json(
      { error: "Erro ao listar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const parsed = parseBody(createProductSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, description, content, composition, usageInstructions, whoCanUse, benefits, differentials, productCategoryId, imageId, galleryImages, status, featured } = parsed.data;

    const slug = generateSlug(name);

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Ja existe um produto com esse slug" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const publishedAt = status === "published" ? now : undefined;

    const [created] = await db
      .insert(products)
      .values({
        name,
        slug,
        description: description || null,
        content: content || null,
        composition: composition || null,
        usageInstructions: usageInstructions || null,
        whoCanUse: whoCanUse || null,
        benefits: benefits || null,
        differentials: differentials || null,
        productCategoryId: productCategoryId || null,
        imageId: imageId || null,
        galleryImages: galleryImages || null,
        status: status || "draft",
        featured: featured ?? false,
        publishedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    revalidateTag("products");

    const h = await headers();
    const tenantId = parseInt(h.get("x-tenant-id") || "1", 10);
    notifyFrontend(tenantId, {
      paths: ["/", `/produtos/${created.slug}/p`],
      tags: ["products"],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/products]", error);
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
