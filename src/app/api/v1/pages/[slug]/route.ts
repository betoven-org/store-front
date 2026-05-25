import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { pages, tenants } from "@brasa/core/schema";
import { eq, and, isNull } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId, draft }, _req, params) => {
  const { slug } = params;

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, slug), isNull(pages.deletedAt)))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Fetch global sections from tenant
  const [tenant] = await db
    .select({ globalSections: tenants.globalSections })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const globals = tenant?.globalSections as { header?: any; footer?: any } | null;

  // Build page sections, filtering out any inline Header/Footer to avoid duplicates
  const pageSections = (draft ? (page.draftSections ?? page.sections) : page.sections) as any[] | null;
  const filteredSections = (pageSections ?? []).filter(
    (s: any) => s?.component !== "Header" && s?.component !== "Footer"
  );

  // Final sections: header + page sections + footer
  const sections = [
    ...(globals?.header ? [globals.header] : []),
    ...filteredSections,
    ...(globals?.footer ? [globals.footer] : []),
  ];

  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogImageUrl: page.ogImageUrl,
    sections,
  });
});
