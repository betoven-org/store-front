/**
 * Matcher engine — evaluates matchers against request context.
 * Logic inspired by deco-cx/apps/website/matchers (Apache-2.0).
 */

import type { MatcherContext, MatcherFn } from "./types";

// ── Individual matcher implementations ──────────────────────────────────────

const deviceMatcher: MatcherFn = (config, ctx) => {
  const { device } = config as { device: string };
  const ua = ctx.userAgent.toLowerCase();

  const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua);
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua) && !isMobile;

  switch (device) {
    case "mobile":
      return isMobile;
    case "tablet":
      return isTablet;
    case "desktop":
      return !isMobile && !isTablet;
    default:
      return true;
  }
};

const randomMatcher: MatcherFn = (config, ctx) => {
  const { percentage, cookieName } = config as { percentage: number; cookieName?: string };
  const key = cookieName || "brasa_random";

  // Sticky session: if cookie exists, use that value
  const existing = ctx.cookies[key];
  if (existing !== undefined) {
    return Number(existing) < percentage;
  }

  // Generate random value 0-99
  const rand = Math.floor(Math.random() * 100);
  return rand < percentage;
};

const dateMatcher: MatcherFn = (config, ctx) => {
  const { start, end } = config as { start?: string; end?: string };
  const now = ctx.now.getTime();

  if (start && now < new Date(start).getTime()) return false;
  if (end && now > new Date(end).getTime()) return false;
  return true;
};

const pathnameMatcher: MatcherFn = (config, ctx) => {
  const { pattern } = config as { pattern: string };
  const pathname = ctx.url.pathname;

  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/\*\*/g, "§DOUBLE§")
    .replace(/\*/g, "[^/]*")
    .replace(/§DOUBLE§/g, ".*");

  return new RegExp(`^${regexStr}$`).test(pathname);
};

const cookieMatcher: MatcherFn = (config, ctx) => {
  const { name, value } = config as { name: string; value?: string };
  const cookieVal = ctx.cookies[name];
  if (cookieVal === undefined) return false;
  if (value !== undefined) return cookieVal === value;
  return true;
};

const queryStringMatcher: MatcherFn = (config, ctx) => {
  const { key, value } = config as { key: string; value?: string };
  const param = ctx.url.searchParams.get(key);
  if (param === null) return false;
  if (value !== undefined) return param === value;
  return true;
};

const hostMatcher: MatcherFn = (config, ctx) => {
  const { hostname } = config as { hostname: string };
  return ctx.url.hostname === hostname;
};

const userAgentMatcher: MatcherFn = (config, ctx) => {
  const { pattern } = config as { pattern: string };
  try {
    return new RegExp(pattern, "i").test(ctx.userAgent);
  } catch {
    return false;
  }
};

const locationMatcher: MatcherFn = (config, ctx) => {
  const { country, region, city } = config as {
    country?: string;
    region?: string;
    city?: string;
  };

  if (country && ctx.geo.country?.toLowerCase() !== country.toLowerCase()) return false;
  if (region && ctx.geo.region?.toLowerCase() !== region.toLowerCase()) return false;
  if (city && ctx.geo.city?.toLowerCase() !== city.toLowerCase()) return false;
  return true;
};

// ── Matcher registry ────────────────────────────────────────────────────────

const matcherRegistry: Record<string, MatcherFn> = {
  device: deviceMatcher,
  random: randomMatcher,
  date: dateMatcher,
  pathname: pathnameMatcher,
  cookie: cookieMatcher,
  queryString: queryStringMatcher,
  host: hostMatcher,
  userAgent: userAgentMatcher,
  location: locationMatcher,
};

// ── Public API ──────────────────────────────────────────────────────────────

export type MatcherRecord = {
  id: number;
  type: string;
  config: Record<string, unknown>;
};

/**
 * Evaluate a single matcher against context.
 * For `multi` and `negate` types, pass all matchers for recursive lookup.
 */
export function evaluateMatcher(
  matcher: MatcherRecord,
  ctx: MatcherContext,
  allMatchers?: Map<number, MatcherRecord>
): boolean {
  // Handle composite matchers
  if (matcher.type === "multi") {
    const { operator, matcherIds } = matcher.config as {
      operator: "and" | "or";
      matcherIds: number[];
    };
    if (!allMatchers || !matcherIds?.length) return true;

    const results = matcherIds.map((id) => {
      const sub = allMatchers.get(id);
      if (!sub) return true;
      return evaluateMatcher(sub, ctx, allMatchers);
    });

    return operator === "and" ? results.every(Boolean) : results.some(Boolean);
  }

  if (matcher.type === "negate") {
    const { matcherId } = matcher.config as { matcherId: number };
    if (!allMatchers || !matcherId) return true;
    const sub = allMatchers.get(matcherId);
    if (!sub) return true;
    return !evaluateMatcher(sub, ctx, allMatchers);
  }

  // Simple matcher
  const fn = matcherRegistry[matcher.type];
  if (!fn) {
    console.warn(`[matcher] Unknown type: ${matcher.type}`);
    return true;
  }

  return fn(matcher.config, ctx);
}

/**
 * Build MatcherContext from a Next.js request.
 */
export function buildMatcherContext(req: Request): MatcherContext {
  const url = new URL(req.url);

  // Parse cookies
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = rest.join("=");
  }

  // Geo from Vercel headers
  const geo = {
    country: req.headers.get("x-vercel-ip-country") || undefined,
    region: req.headers.get("x-vercel-ip-country-region") || undefined,
    city: req.headers.get("x-vercel-ip-city") || undefined,
    latitude: req.headers.get("x-vercel-ip-latitude") || undefined,
    longitude: req.headers.get("x-vercel-ip-longitude") || undefined,
  };

  return {
    url,
    userAgent: req.headers.get("user-agent") || "",
    cookies,
    geo,
    now: new Date(),
  };
}
