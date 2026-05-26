import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, inArray, eq } from "drizzle-orm";
import { z } from "zod";
import { parseBody } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

const schema = z.object({
  ids: z.array(z.number().int()).min(1, "Selecione ao menos uma pagina"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = parseBody(schema, body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { ids } = parsed.data;
  const tenantId = await getTenantId();

  await db
    .update(pages)
    .set({ draft: null, updatedAt: new Date().toISOString() })
    .where(and(inArray(pages.id, ids), eq(pages.tenantId, tenantId)));

  return NextResponse.json({ success: true, discarded: ids.length });
}
