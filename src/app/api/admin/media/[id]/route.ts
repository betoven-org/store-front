import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { media } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";
import { z } from "zod";

const patchSchema = z
  .object({
    alt: z.string().max(255).optional(),
    filename: z.string().max(255).optional(),
  })
  .refine((data) => data.alt !== undefined || data.filename !== undefined, {
    message: "Pelo menos um campo (alt ou filename) deve ser fornecido",
  });

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const mediaId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [record] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Media nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Media get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar media" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const mediaId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};
    if (parsed.data.alt !== undefined) updateData.alt = parsed.data.alt;
    if (parsed.data.filename !== undefined)
      updateData.filename = parsed.data.filename;

    const [updated] = await db
      .update(media)
      .set(updateData)
      .where(and(eq(media.id, mediaId), eq(media.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Media nao encontrada" },
        { status: 404 }
      );
    }

    revalidateTag("media");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Media patch error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar media" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const mediaId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados invalidos" },
        { status: 400 },
      );
    }

    const updateData: Record<string, string> = {};
    if (parsed.data.alt !== undefined) updateData.alt = parsed.data.alt;
    if (parsed.data.filename !== undefined) updateData.filename = parsed.data.filename;

    const [updated] = await db
      .update(media)
      .set(updateData)
      .where(and(eq(media.id, mediaId), eq(media.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Media nao encontrada" }, { status: 404 });
    }

    revalidateTag("media");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Media patch error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar media" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const mediaId = Number(id);
    const tenantId = await getTenantId();

    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const [record] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Media nao encontrada" },
        { status: 404 }
      );
    }

    // Delete blobs from Vercel Blob
    const urlsToDelete = [
      record.url,
      record.thumbnailUrl,
      record.cardUrl,
      record.heroUrl,
    ].filter((url): url is string => url !== null && url !== undefined);

    try {
      await del(urlsToDelete);
    } catch (blobError) {
      console.error(
        "Blob deletion failed (continuing with DB delete):",
        blobError
      );
    }

    await db
      .delete(media)
      .where(and(eq(media.id, mediaId), eq(media.tenantId, tenantId)));

    revalidateTag("media");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media delete error:", error);
    return NextResponse.json(
      { error: "Erro ao deletar media" },
      { status: 500 }
    );
  }
}
