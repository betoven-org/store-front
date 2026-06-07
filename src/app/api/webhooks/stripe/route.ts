import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@brasa/core/db";
import { subscriptions } from "@brasa/core/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura ausente" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json(
      { error: "Assinatura invalida" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;
      const tenantId = Number(session.metadata?.tenantId || "1");

      const nextDue = new Date();
      nextDue.setMonth(nextDue.getMonth() + 1);

      // Buscar o priceId da subscription
      let stripePriceId: string | null = null;
      if (stripeSubscriptionId) {
        const stripeSub = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        stripePriceId = stripeSub.items.data[0]?.price?.id || null;
      }

      // Extrair CPF/CNPJ do custom_fields
      const taxId =
        (session as any).custom_fields?.find(
          (f: any) => f.key === "cpf_cnpj",
        )?.text?.value || null;

      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            status: "active",
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId,
            taxId,
            nextDueDate: nextDue.toISOString(),
            updatedAt: now,
          })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          tenantId,
          status: "active",
          stripeCustomerId,
          stripeSubscriptionId,
          stripePriceId,
          taxId,
          nextDueDate: nextDue.toISOString(),
          graceDays: 7,
          createdAt: now,
          updatedAt: now,
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Record<string, any>;
      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (stripeSubscriptionId) {
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 1);

        await db
          .update(subscriptions)
          .set({
            status: "active",
            nextDueDate: nextDue.toISOString(),
            updatedAt: now,
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Record<string, any>;
      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (stripeSubscriptionId) {
        await db
          .update(subscriptions)
          .set({
            status: "overdue",
            updatedAt: now,
          })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await db
        .update(subscriptions)
        .set({
          status: "suspended",
          updatedAt: now,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;

      let newStatus: "active" | "overdue" | "suspended";
      if (sub.status === "active" || sub.status === "trialing") {
        newStatus = "active";
      } else if (sub.status === "past_due") {
        newStatus = "overdue";
      } else {
        // canceled, unpaid, incomplete, incomplete_expired, paused
        newStatus = "suspended";
      }

      await db
        .update(subscriptions)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
