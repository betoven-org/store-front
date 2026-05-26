import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { posts, categories, authors, tags, media } from "@brasa/core/schema";
import { and, eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, updatePostSchema } from "@brasa/core/validations";
import { getContentStats } from "@/lib/content-utils";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const postId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(postId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [post] = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        content: posts.content,
        status: posts.status,
        featured: posts.featured,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        coverUrl: posts.coverUrl,
        categoryId: posts.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        authorId: posts.authorId,
        authorName: authors.name,
        authorSlug: authors.slug,
        authorBio: authors.bio,
        heroImageId: posts.heroImageId,
        heroImageUrl: media.url,
        heroImageAlt: media.alt,
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(authors, eq(posts.authorId, authors.id))
      .leftJoin(media, eq(posts.heroImageId, media.id))
      .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post nao encontrado" }, { status: 404 });
    }

    const postTags = await db
      .select({ id: tags.id, tag: tags.tag })
      .from(tags)
      .where(and(eq(tags.postId, postId), eq(tags.tenantId, tenantId)));

    return NextResponse.json({ ...post, tags: postTags });
  } catch (error) {
    console.error("[GET /api/admin/posts/:id]", error);
    return NextResponse.json(
      { error: "Erro ao buscar post" },
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
    const postId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(postId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Post nao encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = parseBody(updatePostSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { tags: postTags, ...validated } = parsed.data;
    const updateData: Record<string, unknown> = { ...validated };

    const now = new Date().toISOString();

    if (validated.title && validated.title !== existing.title) {
      updateData.slug = generateSlug(validated.title);

      const [slugConflict] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.slug, updateData.slug as string), eq(posts.tenantId, tenantId)))
        .limit(1);

      if (slugConflict && slugConflict.id !== postId) {
        return NextResponse.json(
          { error: "Ja existe um post com esse slug" },
          { status: 409 }
        );
      }
    }

    if (
      validated.status === "published" &&
      existing.status !== "published" &&
      !existing.publishedAt
    ) {
      updateData.publishedAt = now;
    }

    updateData.updatedAt = now;

    // Recalcular wordCount e readingTime se content mudou
    if (validated.content !== undefined) {
      const stats = getContentStats(validated.content);
      updateData.wordCount = stats.wordCount;
      updateData.readingTimeMinutes = stats.readingTimeMinutes;
    }

    const [updated] = await db
      .update(posts)
      .set(updateData)
      .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
      .returning();

    if (postTags && Array.isArray(postTags)) {
      await db.delete(tags).where(and(eq(tags.postId, postId), eq(tags.tenantId, tenantId)));

      if (postTags.length > 0) {
        await db.insert(tags).values(
          postTags.map((tag: string) => ({
            postId,
            tag,
            tenantId,
          }))
        );
      }
    }

    revalidateTag("posts");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/posts/:id]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar post" },
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
    const postId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(postId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Post nao encontrado" }, { status: 404 });
    }

    await db.delete(tags).where(and(eq(tags.postId, postId), eq(tags.tenantId, tenantId)));
    await db.delete(posts).where(and(eq(posts.id, postId), eq(posts.tenantId, tenantId)));

    revalidateTag("posts");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/posts/:id]", error);
    return NextResponse.json(
      { error: "Erro ao excluir post" },
      { status: 500 }
    );
  }
}
