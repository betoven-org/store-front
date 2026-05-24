import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { parseBody } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";
import { notifyFrontend } from "@brasa/core/revalidate";

const schema = z.object({
  ids: z.array(z.number().int()).min(1, "Selecione ao menos uma pagina"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = parseBody(schema, body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { ids } = parsed.data;
  const tenantId = await getTenantId();

  const pending = await db
    .select()
    .from(pages)
    .where(and(inArray(pages.id, ids), eq(pages.tenantId, tenantId)));

  let published = 0;

  for (const page of pending) {
    if (!page.draft) continue;
    const draft = page.draft as Record<string, unknown>;

    await db
      .update(pages)
      .set({
        title: (draft.title as string) ?? page.title,
        metaTitle: (draft.metaTitle as string) ?? page.metaTitle,
        metaDescription: (draft.metaDescription as string) ?? page.metaDescription,
        ogTitle: (draft.ogTitle as string) ?? page.ogTitle,
        ogDescription: (draft.ogDescription as string) ?? page.ogDescription,
        ogImageUrl: (draft.ogImageUrl as string) ?? page.ogImageUrl,
        content: (draft.content as string) ?? page.content,
        draft: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(pages.id, page.id), eq(pages.tenantId, tenantId)));

    published++;
  }

  revalidateTag("pages");

  const publishedSlugs = pending
    .filter((p) => p.draft)
    .map((p) => `/${p.slug === "home" ? "" : p.slug}`);
  notifyFrontend(tenantId, {
    paths: publishedSlugs.length > 0 ? publishedSlugs : ["/"],
    tags: ["pages"],
  });

  return NextResponse.json({ success: true, published });
}
