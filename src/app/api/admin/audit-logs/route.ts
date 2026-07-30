import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { auditLogs } from "@/db/schema";
import { eq, and, desc, count, ilike, or } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const { searchParams } = request.nextUrl;

  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const offset = (page - 1) * limit;
  const search = searchParams.get("search");
  const resource = searchParams.get("resource");

  const conditions = [eq(auditLogs.tenantId, tenantId)];

  if (resource) {
    conditions.push(eq(auditLogs.resource, resource));
  }

  if (search) {
    conditions.push(
      or(
        ilike(auditLogs.userName, `%${search}%`),
        ilike(auditLogs.action, `%${search}%`),
        ilike(auditLogs.resourceTitle, `%${search}%`),
      )!,
    );
  }

  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(auditLogs)
    .where(where);

  const docs = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    docs,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
}
