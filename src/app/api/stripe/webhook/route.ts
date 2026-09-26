import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: "stripe_not_configured" }, { status: 400 });
  const stripe = new Stripe(key);
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, request.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const interval = session.metadata?.interval;
    if (userId && (plan === "BUILDER" || plan === "PRO")) {
      await db.user.update({
        where: { id: userId },
        data: {
          plan,
          billingInterval: interval === "ANNUAL" ? "ANNUAL" : "MONTHLY",
          stripeCustomerId: session.customer ? String(session.customer) : undefined,
          stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await db.user.updateMany({
      where: { stripeSubscriptionId: event.data.object.id },
      data: { plan: "FREE", billingInterval: "NONE" },
    });
  }

  return NextResponse.json({ received: true });
}
