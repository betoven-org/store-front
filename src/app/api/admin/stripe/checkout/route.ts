import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

async function getOrCreatePrice(): Promise<string> {
  const prices = await stripe.prices.list({
    lookup_keys: ["cms_mensal"],
    limit: 1,
  });

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  const product = await stripe.products.create({
    name: "Brasa CMS — Plano Mensal",
    description:
      "Plataforma de gestao de conteudo com Page Builder, editor de posts, analytics integrado e hospedagem inclusa.",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 55000,
    currency: "brl",
    recurring: { interval: "month" },
    lookup_key: "cms_mensal",
  });

  return price.id;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const tenantId = await getTenantId();
    const email = session.user.email;

    // Verificar se ja existe um stripeCustomerId salvo
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    let customerId: string | undefined;

    if (sub?.stripeCustomerId) {
      customerId = sub.stripeCustomerId;
    } else {
      // Buscar cliente existente no Stripe pelo email
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      }
    }

    const priceId = await getOrCreatePrice();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/pagamento-pendente`,
      metadata: { tenantId: String(tenantId) },
      custom_fields: [
        {
          key: "cpf_cnpj",
          label: { type: "custom", custom: "CPF ou CNPJ" },
          type: "text",
          text: { minimum_length: 11, maximum_length: 18 },
        },
      ],
      tax_id_collection: { enabled: true },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao criar sessao de checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
