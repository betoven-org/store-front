import { db } from "@brasa/core/db";
import { media } from "@brasa/core/schema";
import { collections, collectionFields, collectionItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { generateSlug } from "@/lib/slug";

// ── Types ────────────────────────────────────────────────────────────────────

export type SyncConfig = {
  supabaseTable: string;
  matchColumn: string;
  fieldMap: Record<string, string>;
  lastSyncAt?: string;
};

export type SyncResult = {
  collectionSlug: string;
  created: number;
  updated: number;
  deleted: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export async function getOrCreateMedia(
  url: string,
  alt: string,
  tenantId: number,
): Promise<string> {
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.supabaseUrl, url), eq(media.tenantId, tenantId)))
    .limit(1);

  if (existing) return String(existing.id);

  const filename = url.split("/").pop() || "image";
  const [created] = await db
    .insert(media)
    .values({
      supabaseUrl: url,
      filename,
      alt,
      url,
      tenantId,
      createdAt: new Date().toISOString(),
    })
    .returning({ id: media.id });

  return String(created.id);
}

// ── Find synced collection by supabase table ─────────────────────────────────

export async function findSyncedCollection(
  supabaseTable: string,
  tenantId: number,
) {
  const allSynced = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      syncConfig: collections.syncConfig,
    })
    .from(collections)
    .where(
      and(eq(collections.tenantId, tenantId), eq(collections.source, "synced")),
    );

  return allSynced.find((c) => {
    const config = c.syncConfig as SyncConfig | null;
    return config?.supabaseTable === supabaseTable;
  });
}

// ── Get field type map for a collection ──────────────────────────────────────

async function getFieldTypes(
  collectionId: number,
): Promise<Map<string, string>> {
  const fields = await db
    .select({ slug: collectionFields.slug, type: collectionFields.type })
    .from(collectionFields)
    .where(eq(collectionFields.collectionId, collectionId));

  const map = new Map<string, string>();
  for (const f of fields) {
    map.set(f.slug, f.type);
  }
  return map;
}

// ── Map Supabase record to collection item data ──────────────────────────────

async function mapRecordToData(
  record: Record<string, unknown>,
  fieldMap: Record<string, string>,
  fieldTypes: Map<string, string>,
  tenantId: number,
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const [supabaseCol, collectionField] of Object.entries(fieldMap)) {
    const value = record[supabaseCol];
    if (value === undefined || value === null) {
      data[collectionField] = null;
      continue;
    }

    const fieldType = fieldTypes.get(collectionField);

    // For image fields, create/find media entry and store the media ID
    if (fieldType === "image" && typeof value === "string" && value.length > 0) {
      const alt =
        (record[`${supabaseCol}_alt`] as string) ||
        (record["title"] as string) ||
        (record["name"] as string) ||
        "image";
      data[collectionField] = await getOrCreateMedia(value, alt, tenantId);
      continue;
    }

    // For json fields, wrap HTML content
    if (fieldType === "json" && typeof value === "string") {
      data[collectionField] = { type: "doc", _html: value };
      continue;
    }

    data[collectionField] = value;
  }

  return data;
}

// ── Derive a slug from the record ────────────────────────────────────────────

function deriveSlug(record: Record<string, unknown>): string {
  if (record["slug"] && typeof record["slug"] === "string") {
    return record["slug"];
  }
  if (record["title"] && typeof record["title"] === "string") {
    return generateSlug(record["title"]);
  }
  if (record["name"] && typeof record["name"] === "string") {
    return generateSlug(record["name"]);
  }
  return generateSlug(String(record["id"] || Date.now()));
}

// ── Generic sync: upsert a single record ─────────────────────────────────────

export async function syncRecord(opts: {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown> | null;
  oldRecord: Record<string, unknown> | null;
  collectionId: number;
  syncConfig: SyncConfig;
  fieldTypes: Map<string, string>;
  tenantId: number;
}): Promise<{ action: "created" | "updated" | "deleted" | "skipped" }> {
  const { type, record, oldRecord, collectionId, syncConfig, fieldTypes, tenantId } = opts;
  const { matchColumn, fieldMap } = syncConfig;

  // ── DELETE ──────────────────────────────────────────────────────────────
  if (type === "DELETE") {
    const data = oldRecord;
    if (!data) return { action: "skipped" };

    const externalId = String(data[matchColumn] ?? "");
    if (!externalId) return { action: "skipped" };

    const [existing] = await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.tenantId, tenantId),
          eq(collectionItems.externalId, externalId),
        ),
      )
      .limit(1);

    if (!existing) return { action: "skipped" };

    await db
      .delete(collectionItems)
      .where(eq(collectionItems.id, existing.id));

    return { action: "deleted" };
  }

  // ── INSERT / UPDATE ────────────────────────────────────────────────────
  if (!record) return { action: "skipped" };

  const externalId = String(record[matchColumn] ?? "");
  if (!externalId) return { action: "skipped" };

  const mappedData = await mapRecordToData(record, fieldMap, fieldTypes, tenantId);
  const slug = deriveSlug(record);
  const now = new Date().toISOString();
  const status: "draft" | "published" =
    record["status"] === "published" ? "published" : "draft";

  const [existing] = await db
    .select({ id: collectionItems.id })
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.tenantId, tenantId),
        eq(collectionItems.externalId, externalId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(collectionItems)
      .set({
        slug,
        data: mappedData,
        status,
        publishedAt:
          status === "published"
            ? (record["published_at"] as string) ||
              (record["published_date"] as string) ||
              now
            : null,
        deletedAt: null, // Un-soft-delete if re-inserted
        updatedAt: (record["updated_at"] as string) || now,
      })
      .where(eq(collectionItems.id, existing.id));

    return { action: "updated" };
  }

  await db.insert(collectionItems).values({
    tenantId,
    collectionId,
    slug,
    data: mappedData,
    status,
    externalId,
    featured: false,
    publishedAt:
      status === "published"
        ? (record["published_at"] as string) ||
          (record["published_date"] as string) ||
          now
        : null,
    createdAt: (record["created_at"] as string) || now,
    updatedAt: (record["updated_at"] as string) || now,
  });

  return { action: "created" };
}

// ── Batch sync: process multiple records for one collection ──────────────────

export async function syncBatch(opts: {
  records: Record<string, unknown>[];
  collectionId: number;
  syncConfig: SyncConfig;
  tenantId: number;
}): Promise<SyncResult> {
  const { records, collectionId, syncConfig, tenantId } = opts;
  const fieldTypes = await getFieldTypes(collectionId);

  const result: SyncResult = {
    collectionSlug: "",
    created: 0,
    updated: 0,
    deleted: 0,
  };

  for (const record of records) {
    const { action } = await syncRecord({
      type: "INSERT",
      record,
      oldRecord: null,
      collectionId,
      syncConfig,
      fieldTypes,
      tenantId,
    });

    if (action === "created") result.created++;
    else if (action === "updated") result.updated++;
  }

  return result;
}

// ── Get field types (exported for webhook handler) ───────────────────────────

export { getFieldTypes as getCollectionFieldTypes };
