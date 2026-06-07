import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { forms, formSubmissions } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * POST /api/v1/forms/:slug — Public form submission endpoint.
 * Frontend sends form data here. Stored in form_submissions table.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenantId = await getTenantId();

  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.slug, slug), eq(forms.tenantId, tenantId), eq(forms.active, true)))
    .limit(1);

  if (!form) {
    return NextResponse.json({ error: "Formulario nao encontrado" }, { status: 404 });
  }

  const data = await req.json();

  await db.insert(formSubmissions).values({
    tenantId,
    formId: form.id,
    data,
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({
    success: true,
    message: form.successMessage || "Enviado com sucesso!",
  });
}

/**
 * GET /api/v1/forms/:slug — Returns form schema (fields) for frontend rendering.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tenantId = await getTenantId();

  const [form] = await db
    .select({ name: forms.name, fields: forms.fields, successMessage: forms.successMessage })
    .from(forms)
    .where(and(eq(forms.slug, slug), eq(forms.tenantId, tenantId), eq(forms.active, true)))
    .limit(1);

  if (!form) {
    return NextResponse.json({ error: "Formulario nao encontrado" }, { status: 404 });
  }

  return NextResponse.json(form, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
