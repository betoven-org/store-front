/**
 * Matcher system — evaluates boolean conditions against request context.
 * Inspired by deco-cx/apps matchers (Apache-2.0).
 */

export type MatcherContext = {
  /** Full request URL */
  url: URL;
  /** User-Agent header */
  userAgent: string;
  /** Cookies map */
  cookies: Record<string, string>;
  /** Geo data from Vercel headers */
  geo: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: string;
    longitude?: string;
  };
  /** Current timestamp */
  now: Date;
};

export type MatcherFn = (config: Record<string, unknown>, ctx: MatcherContext) => boolean;

// ── Matcher config types ────────────────────────────────────────────────────

export type DeviceConfig = {
  device: "mobile" | "tablet" | "desktop";
};

export type RandomConfig = {
  /** Traffic percentage 0-100 */
  percentage: number;
  /** Cookie name for sticky session */
  cookieName?: string;
};

export type DateConfig = {
  start?: string; // ISO datetime
  end?: string;   // ISO datetime
};

export type PathnameConfig = {
  /** URL path pattern — supports * and ** wildcards */
  pattern: string;
};

export type CookieConfig = {
  name: string;
  value?: string; // if omitted, just checks existence
};

export type QueryStringConfig = {
  key: string;
  value?: string; // if omitted, just checks existence
};

export type HostConfig = {
  hostname: string;
};

export type UserAgentConfig = {
  /** Regex pattern to match against UA string */
  pattern: string;
};

export type LocationConfig = {
  country?: string;
  region?: string;
  city?: string;
};

export type MultiConfig = {
  /** AND or OR composition */
  operator: "and" | "or";
  /** Matcher IDs to evaluate */
  matcherIds: number[];
};

export type NegateConfig = {
  /** Matcher ID to negate */
  matcherId: number;
};
