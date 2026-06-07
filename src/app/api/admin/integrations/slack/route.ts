import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";

/**
 * POST /api/admin/integrations/slack — Send notification to Slack webhook
 * Body: { text, channel? }
 *
 * Also exports a helper for internal use (e.g. publish hook)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "SLACK_WEBHOOK_URL não configurada" }, { status: 500 });
  }

  const { text, blocks } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Slack retornou ${res.status}` }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao notificar Slack" },
      { status: 500 },
    );
  }
}

/**
 * Helper: notify Slack from server-side (e.g. on publish)
 * Call this from other API routes without auth check.
 */
export async function notifySlack(text: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Silent fail — notification is best-effort
  }
}
