import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@brasa/core/auth";

const INGEST_SECRET = process.env.METRICS_INGEST_SECRET || "metrics-internal-key";
const TENANT_HEADER = "x-tenant-id";

// Paths to skip metrics collection
const SKIP_METRICS = /^\/((_next|favicon|logo|apple-touch|manifest|robots|sitemap|feed|api\/metrics|api\/tenant))/;

// Bots maliciosos
const BLOCK_BOTS = /semrush|ahref|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|claudebot|anthropic|dataprovider|barkrowler|seekport|zoominfobot|censys|netcraft|masscan|nmap|zgrab|httpx|nuclei|nikto|sqlmap|dirbuster|gobuster|wpscan|acunetix|nessus|openvas/i;

// In-memory tenant cache (hostname -> tenantId, TTL 5min)
const tenantCache = new Map<string, { id: number; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveTenantId(host: string, origin: string): Promise<number> {
  const hostname = host.split(":")[0];

  const cached = tenantCache.get(hostname);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.id;
  }

  try {
    const res = await fetch(`${origin}/api/tenant?host=${encodeURIComponent(hostname)}`);
    if (res.ok) {
      const data = await res.json();
      const id = data.id || 1;
      tenantCache.set(hostname, { id, ts: Date.now() });
      return id;
    }
  } catch {
    // Fallback on error
  }

  return 1;
}

export default async function middleware(req: NextRequest) {
  const start = Date.now();
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";

  // Block bad bots
  if (BLOCK_BOTS.test(ua)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!ua && !pathname.startsWith("/api/")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Root → admin
  if (pathname === "/") {
    return Response.redirect(new URL("/admin", req.nextUrl.origin));
  }

  // Skip tenant resolution for internal APIs
  if (pathname === "/api/tenant") {
    return NextResponse.next();
  }

  // Let Neon Auth API routes pass through
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Resolve tenant
  const host = req.headers.get("host") || "localhost";
  const tenantId = await resolveTenantId(host, req.nextUrl.origin);

  const isLoginPage = pathname === "/admin/login";
  const isRecoverPage = pathname === "/admin/recuperar-senha" || pathname === "/admin/redefinir-senha";
  const isRegisterPage = pathname === "/admin/criar-conta";
  const isPaymentPage = pathname === "/admin/pagamento-pendente";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  // Check auth via Neon Auth session
  let isAuthenticated = false;
  try {
    const { data: session } = await neonAuth.getSession();
    isAuthenticated = !!session?.user;
  } catch {
    // Not authenticated
  }

  // Public routes
  if (
    isLoginPage ||
    isRecoverPage ||
    isRegisterPage ||
    isPaymentPage ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/subscription-status") ||
    pathname === "/api/auth/register"
  ) {
    return trackAndReturn(injectTenant(tenantId, req), req, start, tenantId);
  }

  // Admin not authenticated → redirect to login
  if (isAdminRoute && !isAuthenticated) {
    return trackAndReturn(
      Response.redirect(new URL("/admin/login", req.nextUrl.origin)),
      req,
      start,
      tenantId,
    );
  }

  // Login when authenticated → redirect to admin
  if (isLoginPage && isAuthenticated) {
    return trackAndReturn(
      Response.redirect(new URL("/admin", req.nextUrl.origin)),
      req,
      start,
      tenantId,
    );
  }

  // Admin authenticated → check subscription
  if ((isAdminRoute || isAdminApi) && isAuthenticated) {
    try {
      const statusRes = await fetch(
        new URL("/api/subscription-status", req.nextUrl.origin),
      );
      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.status === "suspended") {
          return trackAndReturn(
            Response.redirect(
              new URL("/admin/pagamento-pendente", req.nextUrl.origin),
            ),
            req,
            start,
            tenantId,
          );
        }
      }
    } catch {
      // Fail open
    }
  }

  return trackAndReturn(injectTenant(tenantId, req), req, start, tenantId);
}

function injectTenant(tenantId: number, req: { headers: Headers }): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TENANT_HEADER, String(tenantId));
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set(TENANT_HEADER, String(tenantId));
  return res;
}

function trackAndReturn(
  response: Response,
  req: NextRequest,
  start: number,
  tenantId: number,
) {
  const { pathname } = req.nextUrl;

  if (SKIP_METRICS.test(pathname)) return response;

  const latencyMs = Date.now() - start;
  const statusCode = response.status || 200;

  try {
    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/metrics/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-metrics-secret": INGEST_SECRET,
      },
      body: JSON.stringify({
        path: pathname,
        method: req.method,
        statusCode,
        latencyMs,
        tenantId,
        country: req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null,
        city: req.headers.get("x-vercel-ip-city") || null,
        userAgent: req.headers.get("user-agent") || "",
        referer: req.headers.get("referer") || null,
        contentLength: response.headers.get("content-length")
          ? parseInt(response.headers.get("content-length")!, 10)
          : null,
      }),
    }).catch(() => {});
  } catch {
    // Never block
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
