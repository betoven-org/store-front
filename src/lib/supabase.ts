import { createClient } from "@supabase/supabase-js";
import { db } from "@brasa/core/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function getSupabaseAdmin() {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback: read from site_settings in DB
  if (!url || !key) {
    const tenantId = await getTenantId();
    const [settings] = await db
      .select({
        supabaseUrl: siteSettings.supabaseUrl,
        supabaseServiceRoleKey: siteSettings.supabaseServiceRoleKey,
      })
      .from(siteSettings)
      .where(eq(siteSettings.tenantId, tenantId))
      .limit(1);

    if (settings?.supabaseUrl) url = settings.supabaseUrl;
    if (settings?.supabaseServiceRoleKey) key = settings.supabaseServiceRoleKey;
  }

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios. Configure nas env vars ou em Configuracoes > Supabase."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Returns { url, key } for direct REST API calls to Supabase.
 * Reads from env vars first, falls back to site_settings in DB.
 */
export async function getSbConfig() {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const tenantId = await getTenantId();
    const [settings] = await db
      .select({
        supabaseUrl: siteSettings.supabaseUrl,
        supabaseServiceRoleKey: siteSettings.supabaseServiceRoleKey,
      })
      .from(siteSettings)
      .where(eq(siteSettings.tenantId, tenantId))
      .limit(1);

    if (settings?.supabaseUrl) url = settings.supabaseUrl;
    if (settings?.supabaseServiceRoleKey) key = settings.supabaseServiceRoleKey;
  }

  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
  }

  return { url: `${url}/rest/v1`, key };
}
