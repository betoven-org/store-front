import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { forms, formSubmissions } from "@brasa/core/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/forms/:id/submissions — Lista respostas do formulário.
 * Query: ?limit=20&offset=0 — ordenado por createdAt desc.
 * Retorna { docs, total }.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const formId = Number(id);
    if (isNaN(formId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const [form] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .limit(1);

    if (!form) {
      return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const where = and(
      eq(formSubmissions.formId, formId),
      eq(formSubmissions.tenantId, tenantId),
    );

    const [docs, [{ total }]] = await Promise.all([
      db
        .select()
        .from(formSubmissions)
        .where(where)
        .orderBy(desc(formSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(formSubmissions).where(where),
    ]);

    return NextResponse.json({ docs, total });
  } catch (error) {
    console.error("[GET /api/admin/forms/:id/submissions]", error);
    return NextResponse.json({ error: "Erro ao buscar respostas" }, { status: 500 });
  }
}
