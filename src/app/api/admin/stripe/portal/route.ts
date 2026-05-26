import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { stripe } from "@/lib/stripe";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const tenantId = await getTenantId();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Nenhum cliente Stripe vinculado a esta assinatura" },
        { status: 404 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/admin/configuracoes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao criar portal de cobranca";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
