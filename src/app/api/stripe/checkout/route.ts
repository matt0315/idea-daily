import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/pricing");
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const plan = String(form.get("plan"));
  const interval = String(form.get("interval"));
  if ((plan !== "BUILDER" && plan !== "PRO") || (interval !== "MONTHLY" && interval !== "ANNUAL")) {
    return redirectTo(request, "/pricing");
  }
  const price = process.env[`STRIPE_PRICE_${plan}_${interval}`];
  if (!price) return redirectTo(request, "/pricing?missing=price");
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`,
    metadata: { userId: user.id, plan, interval },
  });
  if (!session.url) return redirectTo(request, "/pricing");
  return redirectTo(request, session.url);
}
