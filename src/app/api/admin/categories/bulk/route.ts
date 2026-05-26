import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { categories, posts } from "@brasa/core/schema";
import { and, inArray, eq, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { parseBody, bulkDeleteSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenantId = await getTenantId();
    const body = await req.json();
    const parsed = parseBody(bulkDeleteSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { ids, action } = parsed.data;

    // Check for linked posts
    for (const id of ids) {
      const [postCount] = await db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.categoryId, id), eq(posts.tenantId, tenantId)));

      if (postCount.total > 0) {
        return NextResponse.json(
          { error: `Categoria ID ${id} possui ${postCount.total} post(s) vinculados` },
          { status: 409 }
        );
      }
    }

    await db.delete(categories).where(and(inArray(categories.id, ids), eq(categories.tenantId, tenantId)));

    revalidateTag("categories");

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    console.error("[POST /api/admin/categories/bulk]", error);
    return NextResponse.json(
      { error: "Erro na operacao em massa" },
      { status: 500 }
    );
  }
}
