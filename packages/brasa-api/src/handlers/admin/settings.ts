import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { siteSettings, media } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { parseBody, updateSettingsSchema } from "@brasa/core/validations";
import { notifyFrontend } from "@brasa/core/revalidate";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const result = await db.query.siteSettings.findFirst({
      where: eq(siteSettings.id, 1),
      with: {
        logo: true,
        favicon: true,
      },
    });

    if (!result) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Settings get error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = parseBody(updateSettingsSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Check if settings row exists
    const [existing] = await db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);

    let result;

    if (existing) {
      [result] = await db
        .update(siteSettings)
        .set({ ...parsed.data, updatedAt: new Date().toISOString() })
        .where(eq(siteSettings.id, 1))
        .returning();
    } else {
      [result] = await db
        .insert(siteSettings)
        .values({ id: 1, ...parsed.data })
        .returning();
    }

    revalidateTag("settings");

    const h = await headers();
    const tenantId = parseInt(h.get("x-tenant-id") || "1", 10);
    notifyFrontend(tenantId, {
      paths: ["/"],
      tags: ["settings"],
    });

    // Re-fetch with relations for the response
    const updated = await db.query.siteSettings.findFirst({
      where: eq(siteSettings.id, 1),
      with: {
        logo: true,
        favicon: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configurações" },
      { status: 500 },
    );
  }
}
