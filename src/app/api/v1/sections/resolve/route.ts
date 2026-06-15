import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import type { BrasaManifest, SectionBlock } from "@brasa/core/manifest";
import { resolveSections } from "@/lib/loaders/resolver";

/**
 * POST /api/v1/sections/resolve
 *
 * Resolves loader data for a single deferred section.
 * Called by the frontend DeferredSection component when the section
 * scrolls into the viewport (IntersectionObserver).
 *
 * Body: { section: SectionBlock }
 * Returns: ResolvedSection with loaderData populated
 */
export const POST = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const body = await req.json();
  const section = body.section as SectionBlock | undefined;

  if (!section || !section.component) {
    return NextResponse.json({ error: "section is required" }, { status: 400 });
  }

  // Fetch manifest for loader schemas
  const [tenant] = await db
    .select({ manifest: tenants.manifest })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const manifest = (tenant?.manifest || { sections: [] }) as BrasaManifest;

  // Force non-deferred so resolver actually runs the loader
  const sectionToResolve: SectionBlock = { ...section, deferred: false };

  const [resolved] = await resolveSections([sectionToResolve], manifest, { tenantId });

  return NextResponse.json(resolved, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
});
