import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { productCategories, products, media } from "@brasa/core/schema";
import { and, eq, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, updateProductCategorySchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const catId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(catId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [cat] = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        slug: productCategories.slug,
        description: productCategories.description,
        imageId: productCategories.imageId,
        imageUrl: media.url,
        sortOrder: productCategories.sortOrder,
        createdAt: productCategories.createdAt,
        updatedAt: productCategories.updatedAt,
      })
      .from(productCategories)
      .leftJoin(media, eq(productCategories.imageId, media.id))
      .where(and(eq(productCategories.id, catId), eq(productCategories.tenantId, tenantId)))
      .limit(1);

    if (!cat)
      return NextResponse.json({ error: "Categoria nao encontrada" }, { status: 404 });

    return NextResponse.json(cat);
  } catch (error) {
    console.error("[GET /api/admin/product-categories/:id]", error);
    return NextResponse.json({ error: "Erro ao buscar categoria" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const catId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(catId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.id, catId), eq(productCategories.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Categoria nao encontrada" }, { status: 404 });

    const body = await req.json();
    const parsed = parseBody(updateProductCategorySchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
      updateData.slug = generateSlug(parsed.data.name);

      const [conflict] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(and(eq(productCategories.slug, updateData.slug as string), eq(productCategories.tenantId, tenantId)))
        .limit(1);

      if (conflict && conflict.id !== catId) {
        return NextResponse.json({ error: "Ja existe uma categoria com esse slug" }, { status: 409 });
      }
    }

    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.imageId !== undefined) updateData.imageId = parsed.data.imageId || null;
    if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;

    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(productCategories)
      .set(updateData)
      .where(and(eq(productCategories.id, catId), eq(productCategories.tenantId, tenantId)))
      .returning();

    revalidateTag("product-categories");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/product-categories/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar categoria" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const catId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(catId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [productCount] = await db
      .select({ total: count() })
      .from(products)
      .where(and(eq(products.productCategoryId, catId), eq(products.tenantId, tenantId)));

    if (productCount.total > 0) {
      return NextResponse.json(
        { error: `Nao e possivel excluir: ${productCount.total} produto(s) vinculados` },
        { status: 409 }
      );
    }

    await db.delete(productCategories).where(and(eq(productCategories.id, catId), eq(productCategories.tenantId, tenantId)));

    revalidateTag("product-categories");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/product-categories/:id]", error);
    return NextResponse.json({ error: "Erro ao excluir categoria" }, { status: 500 });
  }
}
