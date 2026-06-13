import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { siteSettings } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import { notifyFrontend } from "@brasa/core/revalidate";

export type ThemeTokens = {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    ring: string;
    destructive: string;
    success: string;
    warning: string;
  };
  fonts: {
    sans: string;
    mono: string;
    display: string;
  };
  radius: string;
  spacing: {
    section: string;
  };
};

const DEFAULT_THEME: ThemeTokens = {
  colors: {
    primary: "oklch(0.22 0.012 60)",
    primaryForeground: "oklch(0.985 0.004 80)",
    secondary: "oklch(0.975 0.006 80)",
    secondaryForeground: "oklch(0.22 0.012 60)",
    background: "oklch(0.985 0.004 80)",
    foreground: "oklch(0.22 0.012 60)",
    muted: "oklch(0.975 0.006 80)",
    mutedForeground: "oklch(0.46 0.010 60)",
    accent: "oklch(0.96 0.030 60)",
    accentForeground: "oklch(0.36 0.14 38)",
    border: "oklch(0.92 0.006 70)",
    ring: "oklch(0.66 0.18 42)",
    destructive: "oklch(0.58 0.20 25)",
    success: "oklch(0.58 0.13 155)",
    warning: "oklch(0.72 0.14 75)",
  },
  fonts: {
    sans: "Geist, ui-sans-serif, system-ui, sans-serif",
    mono: "Geist Mono, ui-monospace, monospace",
    display: "Fraunces, serif",
  },
  radius: "0.4375rem",
  spacing: {
    section: "4rem",
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [settings] = await db
    .select({ theme: siteSettings.theme })
    .from(siteSettings)
    .where(eq(siteSettings.tenantId, tenantId))
    .limit(1);

  const theme = (settings?.theme as ThemeTokens) || DEFAULT_THEME;

  return NextResponse.json(theme);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();

  await db
    .update(siteSettings)
    .set({ theme: body, updatedAt: new Date().toISOString() })
    .where(eq(siteSettings.tenantId, tenantId));

  revalidateTag("settings");
  notifyFrontend(tenantId, { paths: ["/"], tags: ["settings"] });

  return NextResponse.json(body);
}
