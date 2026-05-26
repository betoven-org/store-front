import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { authors, posts, media } from "@brasa/core/schema";
import { and, eq, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, updateAuthorSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const authorId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(authorId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [author] = await db
      .select({
        id: authors.id,
        name: authors.name,
        slug: authors.slug,
        bio: authors.bio,
        avatarId: authors.avatarId,
        avatarUrl: media.url,
        avatarAlt: media.alt,
        createdAt: authors.createdAt,
        updatedAt: authors.updatedAt,
      })
      .from(authors)
      .leftJoin(media, eq(authors.avatarId, media.id))
      .where(and(eq(authors.id, authorId), eq(authors.tenantId, tenantId)))
      .limit(1);

    if (!author) {
      return NextResponse.json(
        { error: "Autor nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(author);
  } catch (error) {
    console.error("[GET /api/admin/authors/:id]", error);
    return NextResponse.json(
      { error: "Erro ao buscar autor" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const authorId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(authorId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(authors)
      .where(and(eq(authors.id, authorId), eq(authors.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Autor nao encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = parseBody(updateAuthorSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
      updateData.slug = generateSlug(parsed.data.name);

      const [slugConflict] = await db
        .select({ id: authors.id })
        .from(authors)
        .where(and(eq(authors.slug, updateData.slug as string), eq(authors.tenantId, tenantId)))
        .limit(1);

      if (slugConflict && slugConflict.id !== authorId) {
        return NextResponse.json(
          { error: "Ja existe um autor com esse slug" },
          { status: 409 }
        );
      }
    }

    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
    if (parsed.data.avatarId !== undefined) updateData.avatarId = parsed.data.avatarId || null;

    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(authors)
      .set(updateData)
      .where(and(eq(authors.id, authorId), eq(authors.tenantId, tenantId)))
      .returning();

    revalidateTag("authors");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/authors/:id]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar autor" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const authorId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(authorId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: authors.id })
      .from(authors)
      .where(and(eq(authors.id, authorId), eq(authors.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Autor nao encontrado" },
        { status: 404 }
      );
    }

    const [postCount] = await db
      .select({ total: count() })
      .from(posts)
      .where(and(eq(posts.authorId, authorId), eq(posts.tenantId, tenantId)));

    if (postCount.total > 0) {
      return NextResponse.json(
        {
          error: `Nao e possivel excluir: existem ${postCount.total} post(s) vinculados a este autor`,
        },
        { status: 409 }
      );
    }

    await db.delete(authors).where(and(eq(authors.id, authorId), eq(authors.tenantId, tenantId)));

    revalidateTag("authors");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/authors/:id]", error);
    return NextResponse.json(
      { error: "Erro ao excluir autor" },
      { status: 500 }
    );
  }
}
