import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { siteSettings } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { isNeonDown, isNeonConnectionError, markNeonDown } from "@/lib/neon-fallback";

const EMPTY_SETTINGS = {
  siteName: null,
  siteDescription: null,
  logo: null,
  favicon: null,
  whatsapp: null,
  social: {},
  newsletter: {},
  seo: {},
  footerText: null,
  copyrightText: null,
  analytics: {},
  scripts: {},
};

export const GET = withApiKey(async ({ tenantId }) => {
  if (isNeonDown()) {
    return NextResponse.json({ ...EMPTY_SETTINGS, _fallback: "defaults" });
  }

  try {
    const row = await db.query.siteSettings.findFirst({
      where: eq(siteSettings.tenantId, tenantId),
      with: { logo: true, favicon: true },
    });

    if (!row) {
      return NextResponse.json(EMPTY_SETTINGS);
    }

    return NextResponse.json({
      siteName: row.siteName,
      siteDescription: row.siteDescription,
      logo: row.logo ? { url: row.logo.url, alt: row.logo.alt } : null,
      favicon: row.favicon ? { url: row.favicon.url } : null,
      whatsapp: row.whatsapp,
      social: {
        facebook: row.facebook,
        instagram: row.instagram,
        youtube: row.youtube,
      },
      newsletter: {
        title: row.newsletterTitle,
        description: row.newsletterDescription,
        consent: row.newsletterConsent,
      },
      seo: {
        title: row.seoTitle,
        titleTemplate: row.seoTitleTemplate || "%s",
        descriptionTemplate: row.seoDescriptionTemplate || "%s",
        description: row.seoDescription,
        keywords: row.seoKeywords,
      },
      footerText: row.footerText,
      copyrightText: row.copyrightText,
      analytics: {
        umamiWebsiteId: row.umamiWebsiteId,
        umamiUrl: row.umamiUrl,
        gtmId: row.gtmId,
        ga4Id: row.ga4Id,
        googleAdsId: row.googleAdsId,
        facebookPixelId: row.facebookPixelId,
      },
      scripts: {
        head: row.customHeadScripts,
        body: row.customBodyScripts,
      },
    });
  } catch (err) {
    if (!isNeonConnectionError(err)) throw err;
    markNeonDown();
    return NextResponse.json({ ...EMPTY_SETTINGS, _fallback: "defaults" });
  }
});
