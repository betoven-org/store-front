import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { notifyFrontend } from "@brasa/core/revalidate";
import { siteSettings, collections } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import { getSbConfig } from "@/lib/supabase";
import {
  syncBatch,
  type SyncConfig,
  type SyncResult,
} from "@/lib/collection-sync";

// ── Supabase paginated fetch ─────────────────────────────────────────────────

async function sbFetchUpdated(
  table: string,
  since: string,
  sbUrl: string,
  sbKey: string,
  orderCol = "updated_at",
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const filter = `${orderCol}=gt.${since}`;
    const res = await fetch(
      `${sbUrl}/${table}?${filter}&offset=${offset}&limit=${limit}&order=${orderCol}.asc`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
    );
    if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }

  return all;
}

// ── Cron handler ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const tenantId = await getTenantId();

    // Block sync if subscription is suspended
    const [sub] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (sub?.status === "suspended") {
      return NextResponse.json(
        { error: "Assinatura suspensa — sincronizacao bloqueada" },
        { status: 402 },
      );
    }

    // Get all synced collections for this tenant
    const syncedCollections = await db
      .select({
        id: collections.id,
        slug: collections.slug,
        syncConfig: collections.syncConfig,
      })
      .from(collections)
      .where(
        and(
          eq(collections.tenantId, tenantId),
          eq(collections.source, "synced"),
        ),
      );

    if (syncedCollections.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: "Nenhuma colecao sincronizada encontrada",
      });
    }

    // Get Supabase connection config
    const { url: sbUrl, key: sbKey } = await getSbConfig();
    const syncStart = new Date().toISOString();
    const results: SyncResult[] = [];

    for (const collection of syncedCollections) {
      const syncConfig = collection.syncConfig as SyncConfig | null;
      if (!syncConfig?.supabaseTable || !syncConfig?.fieldMap) continue;

      const since = syncConfig.lastSyncAt || "2000-01-01T00:00:00.000Z";

      // Determine order column — some tables might not have updated_at
      // Try updated_at first; if the table is known to lack it, use created_at
      let orderCol = "updated_at";
      try {
        const testRes = await fetch(
          `${sbUrl}/${syncConfig.supabaseTable}?select=updated_at&limit=1`,
          { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
        );
        if (!testRes.ok) {
          orderCol = "created_at";
        }
      } catch {
        orderCol = "created_at";
      }

      // Fetch updated rows from Supabase
      const rows = await sbFetchUpdated(
        syncConfig.supabaseTable,
        since,
        sbUrl,
        sbKey,
        orderCol,
      );

      if (rows.length === 0) {
        results.push({
          collectionSlug: collection.slug,
          created: 0,
          updated: 0,
          deleted: 0,
        });
        continue;
      }

      // Sync all rows into collection_items
      const result = await syncBatch({
        records: rows,
        collectionId: collection.id,
        syncConfig,
        tenantId,
      });
      result.collectionSlug = collection.slug;
      results.push(result);

      // Update lastSyncAt in syncConfig
      const updatedConfig: SyncConfig = {
        ...syncConfig,
        lastSyncAt: syncStart,
      };
      await db
        .update(collections)
        .set({ syncConfig: updatedConfig, updatedAt: syncStart })
        .where(eq(collections.id, collection.id));

      // Revalidate cache for this collection
      revalidateTag(`collection:${collection.slug}`);
      notifyFrontend(tenantId, { tags: [`collection:${collection.slug}`] });
    }

    // Also update the global lastSyncAt in siteSettings for backward compat
    await db
      .update(siteSettings)
      .set({ lastSyncAt: syncStart })
      .where(eq(siteSettings.tenantId, tenantId));

    const totalSynced = results.reduce(
      (sum, r) => sum + r.created + r.updated,
      0,
    );

    return NextResponse.json({
      synced: totalSynced,
      collections: results,
    });
  } catch (error) {
    console.error("[CRON supabase-sync]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro no sync incremental",
      },
      { status: 500 },
    );
  }
}
