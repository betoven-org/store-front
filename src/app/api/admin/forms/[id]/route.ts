import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { forms, formSubmissions } from "@brasa/core/schema";
import { and, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { parseBody } from "@brasa/core/validations";
import { getTenantId } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "textarea", "select", "phone", "number"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

const updateFormSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minusculas, numeros e hifens")
    .optional(),
  fields: z.array(formFieldSchema).optional(),
  successMessage: z.string().nullable().optional(),
  notifyEmail: z.string().email("Email de notificacao invalido").nullable().optional().or(z.literal("").transform(() => null)),
  active: z.boolean().optional(),
});

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await ctx.params;
    const formId = Number(id);
    if (isNaN(formId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .limit(1);

    if (!form) {
      return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("[GET /api/admin/forms/:id]", error);
    return NextResponse.json({ error: "Erro ao buscar formulário" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const formId = Number(id);
    if (isNaN(formId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const [existing] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = parseBody(updateFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, slug, fields: formFields, successMessage, notifyEmail, active } = parsed.data;

    if (slug !== undefined) {
      const [slugConflict] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(and(eq(forms.slug, slug), eq(forms.tenantId, tenantId), ne(forms.id, formId)))
        .limit(1);

      if (slugConflict) {
        return NextResponse.json(
          { error: "Já existe um formulário com esse slug" },
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (formFields !== undefined) updateData.fields = formFields;
    if (successMessage !== undefined) updateData.successMessage = successMessage;
    if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail;
    if (active !== undefined) updateData.active = active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const [updated] = await db
      .update(forms)
      .set(updateData)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .returning();

    revalidateTag("forms");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/admin/forms/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar formulário" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const formId = Number(id);
    if (isNaN(formId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const [existing] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
    }

    // Deleta submissions explicitamente — o schema declara onDelete: "cascade",
    // mas as tabelas foram criadas via push e o cascade pode não existir no banco.
    await db
      .delete(formSubmissions)
      .where(and(eq(formSubmissions.formId, formId), eq(formSubmissions.tenantId, tenantId)));

    await db.delete(forms).where(and(eq(forms.id, formId), eq(forms.tenantId, tenantId)));

    revalidateTag("forms");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/forms/:id]", error);
    return NextResponse.json({ error: "Erro ao excluir formulário" }, { status: 500 });
  }
}
