import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { pages } from "@brasa/core/schema";
import { asc, eq, and, isNull } from "drizzle-orm";
import { parseBody, createPageSchema } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";
import { getTemplateById } from "@/lib/page-templates";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const tenantId = await getTenantId();
    const docs = await db.select().from(pages).where(and(eq(pages.tenantId, tenantId), isNull(pages.deletedAt))).orderBy(asc(pages.title));

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Pages list error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar páginas" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const parsed = parseBody(createPageSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { title, slug } = parsed.data;

    const normalized = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    // Resolve sections from template or direct body
    let initialSections: unknown[] | null = null;
    if (body.templateId && typeof body.templateId === "string") {
      const template = getTemplateById(body.templateId);
      if (template) {
        initialSections = template.sections;
      }
    } else if (Array.isArray(body.sections)) {
      initialSections = body.sections;
    }

    const now = new Date().toISOString();
    const [created] = await db.insert(pages).values({
      title,
      slug: normalized,
      tenantId,
      sections: initialSections,
      draftSections: initialSections,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Ja existe uma pagina com esse slug" }, { status: 409 });
    }
    console.error("Page create error:", error);
    return NextResponse.json({ error: "Erro ao criar pagina" }, { status: 500 });
  }
}
