import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { getSbConfig } from "@/lib/supabase";

type ColumnInfo = {
  name: string;
  type: string;
  cmsType: "text" | "long_text" | "number" | "boolean" | "date" | "image" | "url" | "json";
};

const PG_TYPE_MAP: Record<string, ColumnInfo["cmsType"]> = {
  text: "text",
  "character varying": "text",
  varchar: "text",
  char: "text",
  name: "text",
  integer: "number",
  bigint: "number",
  smallint: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  boolean: "boolean",
  "timestamp with time zone": "date",
  "timestamp without time zone": "date",
  date: "date",
  jsonb: "json",
  json: "json",
  uuid: "text",
};

const SKIP_COLUMNS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "search_vector",
  "tenant_id",
]);

function inferCmsType(colName: string, pgType: string, sampleValue: unknown): ColumnInfo["cmsType"] {
  // Image heuristic: column name + string value looks like URL
  if (
    typeof sampleValue === "string" &&
    (sampleValue.startsWith("http") || sampleValue.startsWith("/")) &&
    (/image|img|photo|avatar|cover|hero|logo|thumb|banner|gallery/i.test(colName) ||
      /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(sampleValue))
  ) {
    return "image";
  }

  // URL heuristic
  if (
    typeof sampleValue === "string" &&
    (sampleValue.startsWith("http://") || sampleValue.startsWith("https://")) &&
    !(/image|img|photo|avatar|cover|hero|logo|thumb/i.test(colName))
  ) {
    return "url";
  }

  // Long text: text columns with >200 chars or HTML
  if (
    (pgType === "text" || pgType === "character varying") &&
    typeof sampleValue === "string" &&
    (sampleValue.length > 200 || /<[a-z][\s\S]*>/i.test(sampleValue))
  ) {
    return "long_text";
  }

  return PG_TYPE_MAP[pgType] || "text";
}

/**
 * GET /api/admin/integrations/supabase/introspect
 *   → lists all Supabase tables
 *
 * GET /api/admin/integrations/supabase/introspect?table=articles
 *   → returns columns, inferred CMS types, and a suggested fieldMap
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { url: sbUrl, key: sbKey } = await getSbConfig();
  const table = req.nextUrl.searchParams.get("table");

  // ── List tables ───────────────────────────────────────────────────────────
  if (!table) {
    const res = await fetch(sbUrl, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Supabase retornou ${res.status}` },
        { status: 502 },
      );
    }

    const swagger = await res.json();
    const paths = Object.keys(swagger.paths || {}).filter(
      (p) => p !== "/" && !p.startsWith("/rpc/"),
    );
    const tables = paths.map((p) => p.replace("/", "")).sort();

    return NextResponse.json({ tables });
  }

  // ── Introspect a single table ─────────────────────────────────────────────
  // Fetch a sample row
  const sampleRes = await fetch(`${sbUrl}/${table}?limit=1&order=id.desc.nullslast`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });

  if (!sampleRes.ok) {
    return NextResponse.json(
      { error: `Tabela "${table}" nao encontrada ou sem acesso (${sampleRes.status})` },
      { status: 404 },
    );
  }

  const rows = await sampleRes.json();
  const sample: Record<string, unknown> = rows[0] || {};

  // Fetch column definitions via PostgREST OpenAPI
  const swaggerRes = await fetch(sbUrl, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  const swagger = await swaggerRes.json();

  const tableDef = swagger.definitions?.[table];
  const pgProperties: Record<string, { type?: string; format?: string; description?: string }> =
    tableDef?.properties || {};

  // Build columns list with inferred types
  const allColumns = Object.keys(sample).length > 0
    ? Object.keys(sample)
    : Object.keys(pgProperties);

  const columns: ColumnInfo[] = [];
  const fieldMap: Record<string, string> = {};
  let suggestedMatchColumn = "id";

  for (const col of allColumns) {
    const pgProp = pgProperties[col];
    // Infer pg type from swagger format/type/description
    let pgType = pgProp?.format || pgProp?.type || "text";
    if (pgProp?.description?.includes("timestamp")) pgType = "timestamp with time zone";

    const cmsType = inferCmsType(col, pgType, sample[col]);

    columns.push({ name: col, type: pgType, cmsType });

    // Build fieldMap for non-skipped columns
    if (!SKIP_COLUMNS.has(col)) {
      // Normalize column name to a clean field slug
      const fieldSlug = col.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
      fieldMap[col] = fieldSlug;
    }

    // Detect best match column
    if (col === "slug") suggestedMatchColumn = "slug";
  }

  return NextResponse.json({
    table,
    columns,
    sample,
    suggestedMatchColumn,
    suggestedFieldMap: fieldMap,
    suggestedFields: columns
      .filter((c) => !SKIP_COLUMNS.has(c.name))
      .map((c, i) => ({
        slug: c.name.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
        name: c.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        type: c.cmsType,
        required: false,
        sortOrder: i,
      })),
  });
}
