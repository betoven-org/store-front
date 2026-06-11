import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import {
  collections,
  collectionFields,
  collectionFieldTypeEnum,
} from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [collection] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!collection)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const fields = await db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(asc(collectionFields.sortOrder));

    return NextResponse.json({ ...collection, fields });
  } catch (error) {
    console.error("Collection get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colecao" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    const body = await request.json();

    // Valida os campos enviados (a tela de configuracao manda o array completo)
    type FieldType = (typeof collectionFieldTypeEnum.enumValues)[number];
    type FieldInput = {
      id?: number;
      slug: string;
      name: string;
      type: FieldType;
      required?: boolean;
      sortOrder?: number;
      config?: unknown;
    };
    let fieldInputs: FieldInput[] | null = null;
    if (body.fields !== undefined) {
      if (!Array.isArray(body.fields)) {
        return NextResponse.json(
          { error: "fields deve ser um array" },
          { status: 400 }
        );
      }
      for (const f of body.fields) {
        if (!f || typeof f !== "object" || !f.slug || !f.name || !f.type) {
          return NextResponse.json(
            { error: "Cada campo precisa de slug, name e type" },
            { status: 400 }
          );
        }
        if (!(collectionFieldTypeEnum.enumValues as readonly string[]).includes(f.type)) {
          return NextResponse.json(
            { error: `Tipo de campo invalido: ${f.type}` },
            { status: 400 }
          );
        }
      }
      fieldInputs = body.fields as FieldInput[];
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) {
      updates.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.source !== undefined) updates.source = body.source;
    if (body.syncConfig !== undefined) updates.syncConfig = body.syncConfig;
    if (body.pageSlugPattern !== undefined) updates.pageSlugPattern = body.pageSlugPattern;
    if (body.pageSections !== undefined) updates.pageSections = body.pageSections;
    if (body.pageDraftSections !== undefined) updates.pageDraftSections = body.pageDraftSections;

    let updated;
    try {
      [updated] = await db
        .update(collections)
        .set(updates)
        .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
        .returning();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        return NextResponse.json(
          { error: "Ja existe uma colecao com esse slug" },
          { status: 409 }
        );
      }
      throw error;
    }

    // Sincroniza campos enviados pela tela de configuracao:
    // - deletedFieldIds: remove os campos. Os valores correspondentes em
    //   collection_items.data ficam orfaos (nao sao limpos) — comportamento aceito.
    // - fields: upsert (com id = update, sem id = insert)
    try {
      if (Array.isArray(body.deletedFieldIds) && body.deletedFieldIds.length > 0) {
        const fieldIdsToDelete = body.deletedFieldIds
          .map((fid: unknown) => Number(fid))
          .filter((fid: number) => Number.isInteger(fid));
        if (fieldIdsToDelete.length > 0) {
          await db
            .delete(collectionFields)
            .where(
              and(
                inArray(collectionFields.id, fieldIdsToDelete),
                eq(collectionFields.collectionId, collectionId)
              )
            );
        }
      }

      if (fieldInputs) {
        for (const f of fieldInputs) {
          if (f.id) {
            await db
              .update(collectionFields)
              .set({
                slug: f.slug,
                name: f.name,
                type: f.type,
                required: f.required ?? false,
                sortOrder: f.sortOrder ?? 0,
                config: f.config ?? null,
              })
              .where(
                and(
                  eq(collectionFields.id, f.id),
                  eq(collectionFields.collectionId, collectionId)
                )
              );
          } else {
            await db.insert(collectionFields).values({
              collectionId,
              slug: f.slug,
              name: f.name,
              type: f.type,
              required: f.required ?? false,
              sortOrder: f.sortOrder ?? 0,
              config: f.config ?? null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        return NextResponse.json(
          { error: "Ja existe um campo com esse slug nesta colecao" },
          { status: 409 }
        );
      }
      throw error;
    }

    const fields = await db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(asc(collectionFields.sortOrder));

    return NextResponse.json({ ...updated, fields });
  } catch (error) {
    console.error("Collection update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar colecao" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const collectionId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(collectionId))
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return NextResponse.json({ error: "Colecao nao encontrada" }, { status: 404 });

    // cascade delete handles fields and items via FK onDelete: "cascade"
    await db
      .delete(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.tenantId, tenantId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collection delete error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir colecao" },
      { status: 500 }
    );
  }
}
