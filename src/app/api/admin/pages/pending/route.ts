import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq, or, isNotNull, isNull } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = await getTenantId();

  // Count pages that have either:
  // - draft (content/metadata changes)
  // - draftSections different from sections
  const docs = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
    })
    .from(pages)
    .where(
      and(
        eq(pages.tenantId, tenantId),
        isNull(pages.deletedAt),
        or(
          isNotNull(pages.draft),
          isNotNull(pages.draftSections)
        )
      )
    );

  return NextResponse.json({ docs });
}
