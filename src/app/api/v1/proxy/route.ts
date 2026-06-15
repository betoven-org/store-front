import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db as appDb } from "@/db";
import { tenantIntegrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/proxy?url=https://...
 *
 * Reverse proxy with text replacement and script injection.
 * Useful for integrating external checkouts, legacy pages, etc.
 *
 * Config stored in tenant_integrations with integration="proxy".
 * Config shape: {
 *   allowedHosts: ["checkout.example.com"],
 *   replacements: [{ from: "old-text", to: "new-text" }],
 *   injectHead?: "<script>...</script>",
 *   injectBody?: "<script>...</script>",
 * }
 */

type ProxyConfig = {
  allowedHosts?: string[];
  replacements?: { from: string; to: string }[];
  injectHead?: string;
  injectBody?: string;
};

export const GET = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Load proxy config for tenant
  let config: ProxyConfig = {};
  try {
    const [integration] = await appDb
      .select({ config: tenantIntegrations.config })
      .from(tenantIntegrations)
      .where(
        and(
          eq(tenantIntegrations.tenantId, tenantId),
          eq(tenantIntegrations.integration, "proxy")
        )
      )
      .limit(1);

    if (integration?.config) {
      config = integration.config as ProxyConfig;
    }
  } catch {
    // No config — allow with defaults
  }

  // Check allowed hosts
  if (config.allowedHosts?.length) {
    const allowed = config.allowedHosts.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
    if (!allowed) {
      return NextResponse.json({ error: "Host not allowed for proxy" }, { status: 403 });
    }
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers.get("user-agent") || "BrasaCMS-Proxy/1.0",
        Accept: req.headers.get("accept") || "text/html",
        "Accept-Language": req.headers.get("accept-language") || "pt-BR",
      },
    });

    const contentType = res.headers.get("content-type") || "";

    // Non-HTML: passthrough
    if (!contentType.includes("text/html")) {
      return new NextResponse(res.body, {
        status: res.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // HTML: apply transformations
    let html = await res.text();

    // Text replacements
    if (config.replacements) {
      for (const { from, to } of config.replacements) {
        html = html.replaceAll(from, to);
      }
    }

    // Script injection
    if (config.injectHead) {
      html = html.replace("</head>", `${config.injectHead}\n</head>`);
    }
    if (config.injectBody) {
      html = html.replace("</body>", `${config.injectBody}\n</body>`);
    }

    return new NextResponse(html, {
      status: res.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Proxy-Origin": parsed.origin,
      },
    });
  } catch (err) {
    console.error("[proxy] Fetch failed:", err);
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
});
