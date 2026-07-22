import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pageVersions } from "@brasa/core/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  const tenantId = await getTenantId();
  if (isNaN(numId))
    return NextResponse.json({ error: "ID invalido" }, { status: 400 });

  const docs = await db
    .select({
      id: pageVersions.id,
      version: pageVersions.version,
      title: pageVersions.title,
      publishedBy: pageVersions.publishedBy,
      publishedAt: pageVersions.publishedAt,
      sectionCount: sql<number>`COALESCE(jsonb_array_length(${pageVersions.sections}), 0)`,
    })
    .from(pageVersions)
    .where(and(eq(pageVersions.pageId, numId), eq(pageVersions.tenantId, tenantId)))
    .orderBy(desc(pageVersions.version));

  return NextResponse.json({ docs });
}
