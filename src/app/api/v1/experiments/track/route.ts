import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as appDb } from "@/db";
import { experimentResults, experiments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/v1/experiments/track
 *
 * Records an impression or conversion for an experiment variant.
 * Called by frontend tracking pixel/beacon.
 *
 * Body: { experimentId, variantId, event: "impression" | "conversion" }
 */
export const POST = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const body = await req.json();
  const { experimentId, variantId, event } = body as {
    experimentId: number;
    variantId: number;
    event: "impression" | "conversion";
  };

  if (!experimentId || !variantId || !event) {
    return NextResponse.json(
      { error: "experimentId, variantId, and event are required" },
      { status: 400 }
    );
  }

  // Verify experiment belongs to tenant and is running
  const experiment = await appDb.query.experiments.findFirst({
    where: and(
      eq(experiments.id, experimentId),
      eq(experiments.tenantId, tenantId),
      eq(experiments.status, "running")
    ),
  });

  if (!experiment) {
    return NextResponse.json({ error: "Experiment not found or not running" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";

  // Upsert: increment counter for today
  const column = event === "conversion" ? "conversions" : "impressions";

  // Try to find existing row for today
  const [existing] = await appDb
    .select()
    .from(experimentResults)
    .where(
      and(
        eq(experimentResults.experimentId, experimentId),
        eq(experimentResults.variantId, variantId),
        eq(experimentResults.recordedAt, today)
      )
    )
    .limit(1);

  if (existing) {
    await appDb
      .update(experimentResults)
      .set({
        [column]: sql`${experimentResults[column]} + 1`,
      })
      .where(eq(experimentResults.id, existing.id));
  } else {
    await appDb.insert(experimentResults).values({
      experimentId,
      variantId,
      impressions: event === "impression" ? 1 : 0,
      conversions: event === "conversion" ? 1 : 0,
      recordedAt: today,
    });
  }

  return NextResponse.json({ tracked: true });
});
