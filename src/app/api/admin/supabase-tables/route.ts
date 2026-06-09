import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { siteSettings } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

// Column type → collection field type mapping
const TYPE_MAP: Record<string, string> = {
  text: "text",
  varchar: "text",
  "character varying": "text",
  char: "text",
  character: "text",
  citext: "text",
  name: "text",
  integer: "number",
  int4: "number",
  int8: "number",
  bigint: "number",
  smallint: "number",
  int2: "number",
  numeric: "number",
  decimal: "number",
  real: "number",
  float4: "number",
  float8: "number",
  "double precision": "number",
  boolean: "boolean",
  bool: "boolean",
  timestamp: "date",
  "timestamp with time zone": "date",
  "timestamp without time zone": "date",
  timestamptz: "date",
  date: "date",
  jsonb: "json",
  json: "json",
  uuid: "text",
};

function mapColumnType(pgType: string): string {
  const lower = pgType.toLowerCase();
  return TYPE_MAP[lower] || "text";
}

// GET /api/admin/supabase-tables — list tables
// GET /api/admin/supabase-tables?table=articles — list columns of a table
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const [settings] = await db
    .select({ supabaseUrl: siteSettings.supabaseUrl, supabaseServiceRoleKey: siteSettings.supabaseServiceRoleKey })
    .from(siteSettings)
    .where(eq(siteSettings.tenantId, tenantId))
    .limit(1);

  if (!settings?.supabaseUrl || !settings?.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Supabase nao configurado. Va em Configuracoes > Supabase." }, { status: 400 });
  }

  const url = settings.supabaseUrl.replace(/\/$/, "");
  const key = settings.supabaseServiceRoleKey;
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table");

  try {
    if (tableName) {
      // Return columns for a specific table
      const res = await fetch(`${url}/rest/v1/${tableName}?limit=0`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/vnd.pgrst.object+json",
          Prefer: "count=exact",
        },
      });

      // Get column info from OpenAPI definition
      const defRes = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });

      if (!defRes.ok) {
        return NextResponse.json({ error: "Erro ao acessar Supabase API" }, { status: 502 });
      }

      const spec = await defRes.json();
      const tableDef = spec.definitions?.[tableName];
      if (!tableDef) {
        return NextResponse.json({ error: `Tabela "${tableName}" nao encontrada` }, { status: 404 });
      }

      const requiredFields = new Set(tableDef.required || []);
      const columns = Object.entries(tableDef.properties || {}).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type || "string",
        format: prop.format || null,
        description: prop.description || null,
        required: requiredFields.has(name),
        fieldType: mapColumnType(prop.format || prop.type || "text"),
      }));

      // Also get a sample row for preview
      const sampleRes = await fetch(`${url}/rest/v1/${tableName}?limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const sample = sampleRes.ok ? await sampleRes.json() : [];

      return NextResponse.json({ table: tableName, columns, sample: sample[0] || null });
    }

    // List all tables via OpenAPI spec
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao acessar Supabase API" }, { status: 502 });
    }

    const spec = await res.json();
    const tables = Object.keys(spec.definitions || {})
      .filter((t) => !t.startsWith("rpc_") && !t.startsWith("_"))
      .sort()
      .map((name) => {
        const def = spec.definitions[name];
        const columnCount = Object.keys(def.properties || {}).length;
        return { name, columnCount };
      });

    return NextResponse.json({ tables });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao conectar com Supabase" },
      { status: 502 },
    );
  }
}
