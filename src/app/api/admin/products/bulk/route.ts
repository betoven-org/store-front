import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { products } from "@brasa/core/schema";
import { and, inArray, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { parseBody, bulkActionSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenantId = await getTenantId();
    const body = await req.json();
    const parsed = parseBody(bulkActionSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { ids, action } = parsed.data;

    const now = new Date().toISOString();

    if (action === "delete") {
      await db.delete(products).where(and(inArray(products.id, ids), eq(products.tenantId, tenantId)));
    } else if (action === "publish") {
      await db
        .update(products)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(and(inArray(products.id, ids), eq(products.tenantId, tenantId)));
    } else if (action === "unpublish") {
      await db
        .update(products)
        .set({ status: "draft", updatedAt: now })
        .where(and(inArray(products.id, ids), eq(products.tenantId, tenantId)));
    }

    revalidateTag("products");

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    console.error("[POST /api/admin/products/bulk]", error);
    return NextResponse.json({ error: "Erro na operacao em massa" }, { status: 500 });
  }
}
