import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { siteSettings } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/v1/theme — Public API for frontend to fetch design tokens.
 * Returns the theme as CSS custom properties ready to inject.
 */
export async function GET(req: NextRequest) {
  const tenantId = await getTenantId();

  const [settings] = await db
    .select({ theme: siteSettings.theme })
    .from(siteSettings)
    .where(eq(siteSettings.tenantId, tenantId))
    .limit(1);

  const theme = settings?.theme as Record<string, unknown> | null;

  if (!theme) {
    return NextResponse.json({ css: "", tokens: null });
  }

  // Generate CSS custom properties from theme
  const colors = (theme.colors || {}) as Record<string, string>;
  const fonts = (theme.fonts || {}) as Record<string, string>;
  const radius = (theme.radius as string) || "0.4375rem";
  const spacing = (theme.spacing || {}) as Record<string, string>;

  const lines: string[] = [":root {"];

  // Colors → CSS vars
  const colorMap: Record<string, string> = {
    primary: "--primary",
    primaryForeground: "--primary-foreground",
    secondary: "--secondary",
    secondaryForeground: "--secondary-foreground",
    background: "--background",
    foreground: "--foreground",
    muted: "--muted",
    mutedForeground: "--muted-foreground",
    accent: "--accent",
    accentForeground: "--accent-foreground",
    border: "--border",
    ring: "--ring",
    destructive: "--destructive",
    success: "--color-success",
    warning: "--color-warning",
  };

  for (const [key, cssVar] of Object.entries(colorMap)) {
    if (colors[key]) {
      lines.push(`  ${cssVar}: ${colors[key]};`);
    }
  }

  // Fonts
  if (fonts.sans) lines.push(`  --font-sans: ${fonts.sans};`);
  if (fonts.mono) lines.push(`  --font-mono: ${fonts.mono};`);
  if (fonts.display) lines.push(`  --font-display: ${fonts.display};`);

  // Radius
  lines.push(`  --radius: ${radius};`);

  // Spacing
  if (spacing.section) lines.push(`  --section-spacing: ${spacing.section};`);

  lines.push("}");

  const css = lines.join("\n");

  return NextResponse.json(
    { css, tokens: theme },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
