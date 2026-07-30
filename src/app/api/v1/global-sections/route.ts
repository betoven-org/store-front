import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const [tenant] = await db
    .select({ globalSections: tenants.globalSections })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return NextResponse.json(tenant?.globalSections ?? { header: null, footer: null });
});
