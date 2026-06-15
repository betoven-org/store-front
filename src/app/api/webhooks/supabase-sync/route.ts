import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { notifyFrontend } from "@brasa/core/revalidate";
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

    const tags: string[] = [];
    const paths: string[] = [];
    let pageAction: string | null = null;
    let collectionAction: string | null = null;
    let collectionSlug: string | null = null;

    // ── Landing pages → CMS pages at campanhas/{slug} ──────────────────────
    if (table === "landing_pages") {
      if (type === "DELETE" && old_record?.slug) {
        await deleteLandingPage(old_record.slug as string, tenantId);
        pageAction = "deleted";
        paths.push(`/campanhas/${old_record.slug}`);
      } else if (record) {
        pageAction = await upsertLandingPage(
          record as unknown as SbLandingPage,
          tenantId,
        );
        paths.push(`/campanhas/${record.slug}`);
      }
      tags.push("pages");
    }

    // ── Collection sync (runs for ALL tables, including landing_pages) ─────
    const collection = await findSyncedCollection(table, tenantId);
    if (collection) {
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

      collectionAction = action;
      collectionSlug = collection.slug;
      tags.push(`collection:${collection.slug}`);
    }

    // ── Revalidate ─────────────────────────────────────────────────────────
    if (tags.length > 0) {
      for (const tag of tags) revalidateTag(tag);
      notifyFrontend(tenantId, { tags, paths: paths.length > 0 ? paths : undefined });
    }

    if (!pageAction && !collectionAction) {
      return NextResponse.json({ ignored: true, table }, { status: 200 });
    }

    return NextResponse.json({
      received: true,
      table,
      type,
      ...(pageAction && { pageAction }),
      ...(collectionSlug && { collection: collectionSlug, collectionAction }),
    });
  } catch (error) {
    console.error("[Webhook supabase-sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no webhook" },
      { status: 500 },
    );
  }
}
