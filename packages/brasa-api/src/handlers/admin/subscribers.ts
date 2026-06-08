import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { subscribers } from "@brasa/core/schema";
import { desc, count, ilike, eq, or, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const tenantId = session.user.tenantId;
    const searchFilter = search
      ? or(
          ilike(subscribers.email, `%${search}%`),
          ilike(subscribers.name, `%${search}%`),
        )
      : undefined;
    const where = searchFilter
      ? and(eq(subscribers.tenantId, tenantId), searchFilter)
      : eq(subscribers.tenantId, tenantId);

    const [docs, [total]] = await Promise.all([
      db
        .select()
        .from(subscribers)
        .where(where)
        .orderBy(desc(subscribers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(subscribers)
        .where(where),
    ]);

    const totalDocs = total.count;
    const totalPages = Math.ceil(totalDocs / limit);

    return NextResponse.json({ docs, totalDocs, totalPages });
  } catch (error) {
    console.error("Subscribers list error:", error);
    return NextResponse.json(
      { error: "Erro ao listar assinantes" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, active } = body as { id: number; active: boolean };

    if (!id || typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Campos id e active sao obrigatorios" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(subscribers)
      .set({ active })
      .where(eq(subscribers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Assinante nao encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Subscriber update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar assinante" },
      { status: 500 },
    );
  }
}
