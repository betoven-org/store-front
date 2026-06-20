/**
 * Neon fallback — circuit breaker + Supabase REST fallback.
 *
 * When Neon is unavailable, v1 API endpoints query Supabase directly
 * using cached sync configs from the collections system.
 */

// ── Circuit Breaker ─────────────────────────────────────────────────────────

let _neonDown = false;
let _lastFailureAt = 0;
const CIRCUIT_COOLDOWN_MS = 30_000;

export function isNeonDown(): boolean {
  if (_neonDown && Date.now() - _lastFailureAt > CIRCUIT_COOLDOWN_MS) {
    _neonDown = false;
  }
  return _neonDown;
}

export function markNeonDown(): void {
  if (!_neonDown) {
    console.warn("[neon-fallback] Neon marked DOWN — Supabase fallback for 30s");
  }
  _neonDown = true;
  _lastFailureAt = Date.now();
}

export function markNeonUp(): void {
  if (_neonDown) {
    console.info("[neon-fallback] Neon is back UP");
  }
  _neonDown = false;
}

export function isNeonConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    msg.includes("getaddrinfo") ||
    msg.includes("connection refused") ||
    msg.includes("connection reset") ||
    msg.includes("connection timeout") ||
    msg.includes("tcp provider") ||
    msg.includes("enotfound")
  );
}

// ── Sync Config Cache ────────────────────────────────────────────────────────

export interface CachedSyncConfig {
  supabaseTable: string;
  fieldMap: Record<string, string>; // supabaseColumn → cmsField
  matchColumn: string;
}

const _cache = new Map<string, CachedSyncConfig>();
const _warmedTenants = new Set<number>();

function _key(tenantId: number, slug: string) {
  return `${tenantId}:${slug}`;
}

export function cacheSyncConfig(
  tenantId: number,
  collectionSlug: string,
  config: CachedSyncConfig,
): void {
  _cache.set(_key(tenantId, collectionSlug), config);
}

export function getCachedSyncConfig(
  tenantId: number,
  collectionSlug: string,
): CachedSyncConfig | undefined {
  return _cache.get(_key(tenantId, collectionSlug));
}

/**
 * Warm all sync configs for a tenant from a list of collections.
 * Call this on first successful Neon query per tenant.
 */
export function warmSyncConfigs(
  tenantId: number,
  collections: Array<{ slug: string; source: string; syncConfig: unknown }>,
): void {
  if (_warmedTenants.has(tenantId)) return;
  _warmedTenants.add(tenantId);
  for (const col of collections) {
    if (col.source === "synced" && col.syncConfig) {
      cacheSyncConfig(tenantId, col.slug, col.syncConfig as CachedSyncConfig);
    }
  }
}

export function isTenantWarmed(tenantId: number): boolean {
  return _warmedTenants.has(tenantId);
}

// ── Supabase REST API ────────────────────────────────────────────────────────

function _sbConfig(): { restUrl: string; key: string } | null {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  return { restUrl: `${base}/rest/v1/`, key };
}

export interface SbQueryOpts {
  select?: string;
  filters?: Record<string, string>; // PostgREST: { "status": "eq.published" }
  or?: string; // PostgREST or=(...) syntax
  order?: string; // e.g. "created_at.desc"
  limit?: number;
  offset?: number;
}

export async function querySupabase<T = Record<string, unknown>>(
  table: string,
  opts: SbQueryOpts = {},
): Promise<{ data: T[]; count: number } | null> {
  const config = _sbConfig();
  if (!config) return null;

  const params = new URLSearchParams();
  params.set("select", opts.select || "*");
  if (opts.order) params.set("order", opts.order);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  if (opts.or) params.set("or", opts.or);
  for (const [k, v] of Object.entries(opts.filters ?? {})) {
    params.set(k, v);
  }

  try {
    const res = await fetch(`${config.restUrl}${table}?${params}`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[supabase-fallback] ${table}: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as T[];
    const range = res.headers.get("content-range");
    let count = data.length;
    if (range) {
      const total = range.split("/").pop();
      if (total && total !== "*") count = Number(total);
    }
    return { data, count };
  } catch (err) {
    console.error("[supabase-fallback] fetch error:", err);
    return null;
  }
}

// ── Transform Supabase rows ─────────────────────────────────────────────────

export function mapSupabaseRow(
  row: Record<string, unknown>,
  fieldMap: Record<string, string>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [sbCol, cmsField] of Object.entries(fieldMap)) {
    data[cmsField] = row[sbCol] ?? null;
  }
  return data;
}

/**
 * Convert a raw Supabase row into a shape compatible with collectionItems mappers.
 */
export function supabaseRowToCollectionItem(
  row: Record<string, unknown>,
  fieldMap: Record<string, string>,
) {
  const data = mapSupabaseRow(row, fieldMap);
  const slug = _deriveSlug(row);
  const rawStatus = (row.status as string) ?? "draft";
  const status: "draft" | "published" =
    rawStatus === "published" || rawStatus === "seo_done" ? "published" : "draft";

  return {
    id: row.id as number,
    slug,
    status,
    featured: row.featured === true,
    data,
    externalId: String(row.id ?? ""),
    publishedAt:
      (row.published_at as string) ||
      (row.published_date as string) ||
      (row.created_at as string) ||
      null,
    createdAt: (row.created_at as string) || null,
    updatedAt: (row.updated_at as string) || null,
    deletedAt: null,
    tenantId: 0,
    collectionId: 0,
  };
}

/**
 * Find the Supabase column name that maps to a given CMS field.
 */
export function findSupabaseColumn(
  fieldMap: Record<string, string>,
  cmsField: string,
): string | undefined {
  return Object.entries(fieldMap).find(([, v]) => v === cmsField)?.[0];
}

// ── Internal helpers ────────────────────────────────────────────────────────

function _deriveSlug(row: Record<string, unknown>): string {
  for (const key of ["slug", "title", "titulo", "name", "nome"]) {
    const val = row[key];
    if (val && typeof val === "string") {
      return key === "slug" ? val : _slugify(val);
    }
  }
  return String(row.id || Date.now());
}

function _slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
