import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, isNotNull, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretParam = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    secretParam !== cronSecret
  ) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const thirtyDaysAgo = sql`NOW() - INTERVAL '30 days'`;

  const deleted = await db
    .delete(pages)
    .where(
      and(
        isNotNull(pages.deletedAt),
        lte(pages.deletedAt, thirtyDaysAgo)
      )
    )
    .returning({ id: pages.id });

  return NextResponse.json({
    ok: true,
    deleted: deleted.length,
  });
}
