import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import {
  findSyncedCollection,
  syncRecord,
  getCollectionFieldTypes,
  type SyncConfig,
} from "@/lib/collection-sync";
import {
  upsertLandingPage,
  deleteLandingPage,
  type SbLandingPage,
} from "@/lib/landing-page-sync";

// ── Auth ────────────────────────────────────────────────────────────────────────

function verifySecret(request: NextRequest): boolean {
  const header = request.headers.get("x-supabase-webhook-secret");
  if (!header) return false;
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  return !!secret && header === secret;
}

// ── Webhook payload ─────────────────────────────────────────────────────────────

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

// ── POST handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json(
      { error: "Webhook secret invalido" },
      { status: 401 },
    );
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

    const payload: WebhookPayload = await request.json();
    const { type, table, record, old_record } = payload;

    // ── Landing pages → CMS pages at campanhas/{slug} ──────────────────────
    if (table === "landing_pages") {
      if (type === "DELETE" && old_record?.slug) {
        await deleteLandingPage(old_record.slug as string, tenantId);
        revalidateTag("pages");
        return NextResponse.json({
          received: true,
          table,
          type,
          action: "deleted",
        });
      }

      if (record) {
        const action = await upsertLandingPage(
          record as unknown as SbLandingPage,
          tenantId,
        );
        revalidateTag("pages");
        return NextResponse.json({
          received: true,
          table,
          type,
          action,
        });
      }
    }

    // Find synced collection matching this Supabase table
    const collection = await findSyncedCollection(table, tenantId);
    if (!collection) {
      return NextResponse.json({ ignored: true, table }, { status: 200 });
    }

    const syncConfig = collection.syncConfig as SyncConfig;
    const fieldTypes = await getCollectionFieldTypes(collection.id);

    const { action } = await syncRecord({
      type,
      record,
      oldRecord: old_record,
      collectionId: collection.id,
      syncConfig,
      fieldTypes,
      tenantId,
    });

    // Revalidate cache using collection slug as tag
    revalidateTag(`collection:${collection.slug}`);

    return NextResponse.json({
      received: true,
      table,
      type,
      collection: collection.slug,
      action,
    });
  } catch (error) {
    console.error("[Webhook supabase-sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no webhook" },
      { status: 500 },
    );
  }
}
