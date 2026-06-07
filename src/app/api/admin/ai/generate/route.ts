import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { aiCredits, aiUsageLog } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * POST /api/admin/ai/generate — AI content generation via OpenAI
 * Body: { prompt, context?, mode: "write" | "rewrite" | "summarize" | "seo" }
 *
 * Credits system: each generation costs 1 credit.
 * New tenants start with 50 free credits. Buy more via admin.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const tenantId = await getTenantId();

  // Check credits
  let [credits] = await db
    .select()
    .from(aiCredits)
    .where(eq(aiCredits.tenantId, tenantId))
    .limit(1);

  if (!credits) {
    // First time — create with 50 free credits
    [credits] = await db
      .insert(aiCredits)
      .values({ tenantId, balance: 50, totalUsed: 0 })
      .returning();
  }

  if (credits.balance <= 0) {
    return NextResponse.json(
      { error: "Créditos de IA esgotados. Adquira mais créditos em Configurações." },
      { status: 402 },
    );
  }

  const { prompt, context, mode = "write" } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt é obrigatório" }, { status: 400 });
  }

  const systemPrompts: Record<string, string> = {
    write: "Você é um redator de conteúdo web profissional. Escreva em português brasileiro, tom informativo e acessível. Responda apenas com o texto solicitado, sem explicações.",
    rewrite: "Você é um editor de textos. Reescreva o texto fornecido melhorando clareza, fluidez e SEO. Mantenha o mesmo significado. Responda apenas com o texto reescrito.",
    summarize: "Resuma o texto fornecido em 1-2 frases concisas em português brasileiro. Responda apenas com o resumo.",
    seo: "Você é um especialista em SEO. Com base no conteúdo fornecido, gere: um meta title (max 60 chars), uma meta description (max 155 chars) e 5 keywords. Responda em JSON: {\"title\": \"\", \"description\": \"\", \"keywords\": \"\"}",
  };

  const systemPrompt = systemPrompts[mode] || systemPrompts.write;
  const userMessage = context ? `Contexto: ${context}\n\nSolicitação: ${prompt}` : prompt;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error?.message || `OpenAI retornou ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;

    // Deduct 1 credit and log usage
    await db
      .update(aiCredits)
      .set({
        balance: credits.balance - 1,
        totalUsed: credits.totalUsed + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiCredits.id, credits.id));

    await db.insert(aiUsageLog).values({
      tenantId,
      userId: Number(session.user.id),
      mode,
      tokensUsed,
    });

    return NextResponse.json({
      content,
      mode,
      creditsRemaining: credits.balance - 1,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro na geração" },
      { status: 500 },
    );
  }
}
