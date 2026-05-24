import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { eq, and } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug } = params;

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug)))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogImageUrl: page.ogImageUrl,
    sections: draft ? (page.draftSections ?? page.sections) : page.sections,
  });
});
