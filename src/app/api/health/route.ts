import { NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Returns: uptime, memory, DB connectivity, timestamp.
 */
export async function GET() {
  const now = Date.now();
  const uptime = Math.floor((now - startTime) / 1000);
  const mem = process.memoryUsage();

  // DB check
  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    // DB unreachable
  }

  const healthy = dbOk;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      uptime,
      timestamp: new Date().toISOString(),
      db: {
        connected: dbOk,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    },
    { status: healthy ? 200 : 503 }
  );
}
