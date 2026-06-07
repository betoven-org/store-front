import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";

/**
 * POST /api/admin/integrations/resend — Send transactional email via Resend
 * Body: { to, subject, html, from? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY não configurada" }, { status: 500 });
  }

  const { to, subject, html, from } = await req.json();

  if (!to || !subject || !html) {
    return NextResponse.json({ error: "to, subject e html são obrigatórios" }, { status: 400 });
  }

  const defaultFrom = process.env.RESEND_FROM_EMAIL || "Brasa CMS <noreply@brasa.tech>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from || defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || `Resend retornou ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({ id: data.id, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar email" },
      { status: 500 },
    );
  }
}
