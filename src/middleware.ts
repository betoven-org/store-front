import { NextResponse, type NextRequest } from "next/server";

const INGEST_SECRET = process.env.METRICS_INGEST_SECRET || "metrics-internal-key";
const TENANT_HEADER = "x-tenant-id";
const IS_DEV = process.env.NODE_ENV === "development";

// Bots maliciosos
const BLOCK_BOTS = /semrush|ahref|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|claudebot|anthropic|dataprovider|barkrowler|seekport|zoominfobot|censys|netcraft|masscan|nmap|zgrab|httpx|nuclei|nikto|sqlmap|dirbuster|gobuster|wpscan|acunetix|nessus|openvas/i;

// In-memory tenant cache (hostname -> tenantId, TTL 5min)
const tenantCache = new Map<string, { id: number; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// In-memory subscription cache (tenantId -> status, TTL 2min)
const subCache = new Map<number, { status: string; ts: number }>();
const SUB_CACHE_TTL = 2 * 60 * 1000;

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

  // Let Better Auth API routes pass through
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Resolve tenant from host first
  const host = req.headers.get("host") || "localhost";
  const tenantId = await resolveTenantId(host, req.nextUrl.origin);

  const isLoginPage = pathname === "/admin/login";
  const isRecoverPage = pathname === "/admin/recuperar-senha" || pathname === "/admin/redefinir-senha";
  const isRegisterPage = pathname === "/admin/criar-conta";
  const isPaymentPage = pathname === "/admin/pagamento-pendente";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  // Check auth via session cookie presence (lightweight, no fetch)
  const cookieHeader = req.headers.get("cookie") || "";
  const isAuthenticated = cookieHeader.includes("better-auth.session_token");

  // Public routes — pass through
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

  // Subscription check — only on admin PAGE loads (not API calls), cached 2min
  if (isAdminRoute && !isAdminApi && isAuthenticated) {
    const cachedSub = subCache.get(tenantId);
    const subStatus = cachedSub && Date.now() - cachedSub.ts < SUB_CACHE_TTL
      ? cachedSub.status
      : null;

    if (subStatus === "suspended") {
      return trackAndReturn(
        Response.redirect(new URL("/admin/pagamento-pendente", req.nextUrl.origin)),
        req,
        start,
        tenantId,
      );
    }

    if (!subStatus) {
      // Fetch and cache (fire-and-forget for non-suspended)
      try {
        const statusRes = await fetch(
          new URL("/api/subscription-status", req.nextUrl.origin),
          {
            headers: {
              cookie: cookieHeader,
              [TENANT_HEADER]: String(tenantId),
            },
          },
        );
        if (statusRes.ok) {
          const data = await statusRes.json();
          subCache.set(tenantId, { status: data.status, ts: Date.now() });
          if (data.status === "suspended") {
            return trackAndReturn(
              Response.redirect(new URL("/admin/pagamento-pendente", req.nextUrl.origin)),
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
  // Skip metrics in dev — only useful in production
  if (IS_DEV) return response;

  const { pathname } = req.nextUrl;

  // Only track page views, not API calls or static assets
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return response;

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
