import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { posts, products, requestMetrics } from "@brasa/core/schema";
import { sql, gte, lte, and, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7", 10);

  const now = new Date();
  const fromDate = new Date(now.getTime() - days * 86400000).toISOString();
  const prevFromDate = new Date(now.getTime() - days * 2 * 86400000).toISOString();
  const toDate = now.toISOString();

  const frontendFilter = and(
    sql`${requestMetrics.path} NOT LIKE '/admin%'`,
    sql`${requestMetrics.path} NOT LIKE '/api%'`,
    eq(requestMetrics.isBot, false),
  );

  try {
    const [
      performanceCurrent,
      performancePrevious,
      slowestPages,
      recentChanges,
      recentPublished,
    ] = await Promise.all([
      // Performance current period
      db
        .select({
          totalRequests: sql<number>`count(*)::int`,
          avgLatency: sql<number>`coalesce(round(avg(${requestMetrics.latencyMs})), 0)::int`,
          p50Latency: sql<number>`coalesce(round(percentile_cont(0.5) within group (order by ${requestMetrics.latencyMs})), 0)::int`,
          p95Latency: sql<number>`coalesce(round(percentile_cont(0.95) within group (order by ${requestMetrics.latencyMs})), 0)::int`,
          p99Latency: sql<number>`coalesce(round(percentile_cont(0.99) within group (order by ${requestMetrics.latencyMs})), 0)::int`,
          errorRate: sql<number>`round(count(*) filter (where ${requestMetrics.statusCode} >= 500)::numeric / greatest(count(*), 1) * 100, 1)`,
        })
        .from(requestMetrics)
        .where(and(gte(requestMetrics.createdAt, fromDate), lte(requestMetrics.createdAt, toDate), frontendFilter)),

      // Performance previous period (for comparison)
      db
        .select({
          totalRequests: sql<number>`count(*)::int`,
          avgLatency: sql<number>`coalesce(round(avg(${requestMetrics.latencyMs})), 0)::int`,
          errorRate: sql<number>`round(count(*) filter (where ${requestMetrics.statusCode} >= 500)::numeric / greatest(count(*), 1) * 100, 1)`,
        })
        .from(requestMetrics)
        .where(and(gte(requestMetrics.createdAt, prevFromDate), lte(requestMetrics.createdAt, fromDate), frontendFilter)),

      // Slowest pages (avg latency)
      db
        .select({
          path: requestMetrics.path,
          avgLatency: sql<number>`round(avg(${requestMetrics.latencyMs}))::int`,
          p95Latency: sql<number>`round(percentile_cont(0.95) within group (order by ${requestMetrics.latencyMs}))::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(requestMetrics)
        .where(and(gte(requestMetrics.createdAt, fromDate), lte(requestMetrics.createdAt, toDate), frontendFilter))
        .groupBy(requestMetrics.path)
        .having(sql`count(*) >= 3`)
        .orderBy(sql`avg(${requestMetrics.latencyMs}) desc`)
        .limit(10),

      // Recent changes (posts + products edited/created)
      db.execute(sql`
        (
          SELECT 'post' as type, title as name, slug, status::text, updated_at, created_at
          FROM posts ORDER BY updated_at DESC LIMIT 8
        )
        UNION ALL
        (
          SELECT 'product' as type, name, slug, product_status::text as status, updated_at, created_at
          FROM products ORDER BY updated_at DESC LIMIT 8
        )
        ORDER BY updated_at DESC
        LIMIT 10
      `),

      // Recently published posts + their pageviews
      db.execute(sql`
        SELECT
          p.title,
          p.slug,
          p.published_at,
          coalesce(m.views, 0)::int as views
        FROM posts p
        LEFT JOIN (
          SELECT path, count(*)::int as views
          FROM request_metrics
          WHERE created_at >= ${fromDate}
            AND is_bot = false
          GROUP BY path
        ) m ON m.path = '/' || p.slug
        WHERE p.status = 'published'
          AND p.published_at IS NOT NULL
        ORDER BY p.published_at DESC
        LIMIT 10
      `),
    ]);

    return NextResponse.json({
      performance: {
        current: performanceCurrent[0] || { totalRequests: 0, avgLatency: 0, p50Latency: 0, p95Latency: 0, p99Latency: 0, errorRate: 0 },
        previous: performancePrevious[0] || { totalRequests: 0, avgLatency: 0, errorRate: 0 },
        slowestPages,
      },
      recentChanges: (recentChanges as any).rows || recentChanges || [],
      releases: (recentPublished as any).rows || recentPublished || [],
    });
  } catch (err) {
    console.error("[admin/dashboard]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
