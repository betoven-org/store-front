import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { users } from "@brasa/core/schema";
import { and, eq, count } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { parseBody, updateUserSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin")
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

    const { id } = await ctx.params;
    const userId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(userId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Erro ao buscar usuário" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin")
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

    const { id } = await ctx.params;
    const userId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(userId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.tenantId, tenantId))).limit(1);
    if (!existing)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const body = await req.json();
    const parsed = parseBody(updateUserSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.email !== undefined) {
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, parsed.data.email), eq(users.tenantId, tenantId)))
        .limit(1);
      if (conflict && conflict.id !== userId) {
        return NextResponse.json({ error: "Email ja em uso" }, { status: 409 });
      }
      updateData.email = parsed.data.email;
    }

    if (parsed.data.role !== undefined) {
      // Prevent removing last admin
      if (existing.role === "admin" && parsed.data.role !== "admin") {
        const [adminCount] = await db
          .select({ total: count() })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.tenantId, tenantId)));
        if (adminCount.total <= 1) {
          return NextResponse.json({ error: "Não é possível remover o último admin" }, { status: 400 });
        }
      }
      updateData.role = parsed.data.role;
    }

    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin")
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

    const { id } = await ctx.params;
    const userId = Number(id);
    const tenantId = await getTenantId();
    if (isNaN(userId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    // Can't delete yourself
    if (String(userId) === session.user.id) {
      return NextResponse.json({ error: "Não é possível excluir o próprio usuário" }, { status: 400 });
    }

    // Can't delete last admin
    const [user] = await db.select({ role: users.role }).from(users).where(and(eq(users.id, userId), eq(users.tenantId, tenantId))).limit(1);
    if (!user)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    if (user.role === "admin") {
      const [adminCount] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.tenantId, tenantId)));
      if (adminCount.total <= 1) {
        return NextResponse.json({ error: "Não é possível excluir o último admin" }, { status: 400 });
      }
    }

    await db.delete(users).where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
  }
}
