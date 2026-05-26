import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { categories } from "@brasa/core/schema";
import { eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateSlug } from "@brasa/core/slug";
import { parseBody, createCategorySchema } from "@brasa/core/validations";
import { notifyFrontend } from "@brasa/core/revalidate";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const docs = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name));

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("[GET /api/admin/categories]", error);
    return NextResponse.json(
      { error: "Erro ao listar categorias" },
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
    const parsed = parseBody(createCategorySchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name } = parsed.data;

    const slug = generateSlug(name);

    const [existingSlug] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existingSlug) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com esse slug" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const [created] = await db
      .insert(categories)
      .values({
        name,
        slug,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    revalidateTag("categories");

    const h = await headers();
    const tenantId = parseInt(h.get("x-tenant-id") || "1", 10);
    notifyFrontend(tenantId, {
      paths: ["/"],
      tags: ["categories"],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/categories]", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}
