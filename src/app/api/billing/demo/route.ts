import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  if (process.env.STRIPE_SECRET_KEY) return redirectTo(request, "/pricing");
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/pricing");
  const form = await request.formData();
  const plan = String(form.get("plan"));
  const interval = String(form.get("interval"));
  if (plan !== "BUILDER" && plan !== "PRO") return redirectTo(request, "/pricing");
  await db.user.update({
    where: { id: user.id },
    data: { plan, billingInterval: interval === "ANNUAL" ? "ANNUAL" : "MONTHLY" },
  });
  return redirectTo(request, "/account?billing=demo");
}
