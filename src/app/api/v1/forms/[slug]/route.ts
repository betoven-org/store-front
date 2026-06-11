import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@brasa/core/db";
import { forms, formSubmissions } from "@brasa/core/schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

type FormFieldDef = {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "phone" | "number";
  required?: boolean;
  options?: string[];
};

// Endpoint público sem auth: limites explícitos contra abuso de storage/bandwidth
const MAX_BODY_BYTES = 100_000; // 100KB por submissão
const MAX_FIELDS = 100;
const MAX_VALUE_LENGTH = 10_000; // chars por campo

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildNotificationHtml(
  formName: string,
  fields: FormFieldDef[],
  data: Record<string, unknown>,
): string {
  const labelByName = new Map(fields.map((f) => [f.name, f.label]));
  // Campos do form primeiro (na ordem definida), depois extras do payload
  const orderedKeys = [
    ...fields.map((f) => f.name).filter((name) => name in data),
    ...Object.keys(data).filter((key) => !labelByName.has(key)),
  ];

  const rows = orderedKeys
    .map((key) => {
      const label = labelByName.get(key) || key;
      const raw = data[key];
      const value =
        raw === null || raw === undefined
          ? "-"
          : typeof raw === "object"
            ? JSON.stringify(raw)
            : String(raw);
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e5e5;background:#fafafa;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e5e5;">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join("");

  return `<div style="font-family:sans-serif;max-width:600px;">
    <h2 style="font-size:16px;">Nova resposta: ${escapeHtml(formName)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows}</table>
    <p style="font-size:12px;color:#888;margin-top:16px;">Enviado via Brasa CMS em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
  </div>`;
}

async function sendSubmissionNotification(
  notifyEmail: string,
  formName: string,
  fields: FormFieldDef[],
  data: Record<string, unknown>,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM_EMAIL || "Brasa CMS <noreply@brasa.tech>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [notifyEmail],
      subject: `Nova resposta: ${formName}`,
      html: buildNotificationHtml(formName, fields, data),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[forms notify] Resend falhou:", res.status, err);
  }
}

/**
 * POST /api/v1/forms/:slug — Public form submission endpoint.
 * Frontend sends form data here. Stored in form_submissions table.
 * Se o form tiver notifyEmail + RESEND_API_KEY, dispara e-mail de notificação
 * (fire-and-forget — nunca quebra o submit).
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

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
  }

  let data: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
    }
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  if (Object.keys(data).length > MAX_FIELDS) {
    return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
  }
  for (const value of Object.values(data)) {
    if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json(
        { error: `Valor de campo excede o limite de ${MAX_VALUE_LENGTH} caracteres` },
        { status: 413 },
      );
    }
  }

  // Valida campos obrigatórios definidos no form
  const fields = (Array.isArray(form.fields) ? form.fields : []) as FormFieldDef[];
  const missing = fields
    .filter((f) => f.required)
    .filter((f) => {
      const value = data[f.name];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((f) => f.label || f.name);

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campos obrigatorios nao preenchidos: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  await db.insert(formSubmissions).values({
    tenantId,
    formId: form.id,
    data,
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  // Notificação por e-mail — fire-and-forget após a resposta, nunca quebra o submit
  if (form.notifyEmail && process.env.RESEND_API_KEY) {
    const notifyEmail = form.notifyEmail;
    const formName = form.name;
    after(async () => {
      try {
        await sendSubmissionNotification(notifyEmail, formName, fields, data);
      } catch (err) {
        console.error("[forms notify] Erro ao enviar e-mail:", err);
      }
    });
  }

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
