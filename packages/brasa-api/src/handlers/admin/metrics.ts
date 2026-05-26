import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { requestMetrics } from "@brasa/core/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  const excludeBots = searchParams.get("bots") !== "include";

  const fromDate = new Date(Date.now() - days * 86400000).toISOString();
  const toDate = new Date().toISOString();

  const baseConditions = [
    gte(requestMetrics.createdAt, fromDate),
    lte(requestMetrics.createdAt, toDate),
  ];
  if (excludeBots) {
    baseConditions.push(eq(requestMetrics.isBot, false));
  }
  const where = and(...baseConditions);

  try {
    const [overview, topPaths, topCountries, timeline, statusBreakdown] =
      await Promise.all([
        // Overview
        db
          .select({
            totalRequests: sql<number>`count(*)::int`,
            avgLatency: sql<number>`round(avg(${requestMetrics.latencyMs}))::int`,
            p95Latency: sql<number>`round(percentile_cont(0.95) within group (order by ${requestMetrics.latencyMs}))::int`,
            totalErrors: sql<number>`count(*) filter (where ${requestMetrics.statusCode} >= 500)::int`,
            totalBandwidth: sql<number>`coalesce(sum(${requestMetrics.contentLength}), 0)::bigint`,
          })
          .from(requestMetrics)
          .where(where),

        // Top paths (only frontend, exclude /admin and /api)
        db
          .select({
            path: requestMetrics.path,
            count: sql<number>`count(*)::int`,
            avgLatency: sql<number>`round(avg(${requestMetrics.latencyMs}))::int`,
          })
          .from(requestMetrics)
          .where(
            and(
              ...baseConditions,
              sql`${requestMetrics.path} NOT LIKE '/admin%'`,
              sql`${requestMetrics.path} NOT LIKE '/api%'`,
            ),
          )
          .groupBy(requestMetrics.path)
          .orderBy(sql`count(*) desc`)
          .limit(15),

        // Top countries
        db
          .select({
            country: requestMetrics.country,
            count: sql<number>`count(*)::int`,
          })
          .from(requestMetrics)
          .where(
            and(
              ...baseConditions,
              sql`${requestMetrics.country} is not null`,
            ),
          )
          .groupBy(requestMetrics.country)
          .orderBy(sql`count(*) desc`)
          .limit(15),

        // Timeline (grouped by day)
        db
          .select({
            date: sql<string>`date(${requestMetrics.createdAt})`,
            requests: sql<number>`count(*)::int`,
            avgLatency: sql<number>`round(avg(${requestMetrics.latencyMs}))::int`,
            errors: sql<number>`count(*) filter (where ${requestMetrics.statusCode} >= 500)::int`,
          })
          .from(requestMetrics)
          .where(where)
          .groupBy(sql`date(${requestMetrics.createdAt})`)
          .orderBy(sql`date(${requestMetrics.createdAt}) asc`),

        // Status code breakdown
        db
          .select({
            statusGroup: sql<string>`(${requestMetrics.statusCode} / 100 * 100)::text || 'xx'`,
            count: sql<number>`count(*)::int`,
          })
          .from(requestMetrics)
          .where(where)
          .groupBy(sql`${requestMetrics.statusCode} / 100`)
          .orderBy(sql`${requestMetrics.statusCode} / 100`),
      ]);

    return NextResponse.json({
      overview: overview[0] || {
        totalRequests: 0,
        avgLatency: 0,
        p95Latency: 0,
        totalErrors: 0,
        totalBandwidth: 0,
      },
      topPaths,
      topCountries,
      timeline,
      statusBreakdown,
    });
  } catch (err) {
    console.error("[admin/metrics]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
