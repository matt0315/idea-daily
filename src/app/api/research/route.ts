import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { executeResearch } from "@/lib/research-job";
import { consumeMeter } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/research");
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "research")) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const description = String(form.get("description") || "").trim();
  const customer = String(form.get("customer") || "").trim();
  const country = String(form.get("country") || "US");
  const url = String(form.get("url") || "").trim();
  if (description.length < 8 || customer.length < 2) return redirectTo(request, "/research");
  const gate = await consumeMeter(user.id, plan, "research");
  if (!gate.ok) return redirectTo(request, "/research?quota=1");
  const created = await db.researchReport.create({
    data: {
      userId: user.id,
      title: description.slice(0, 80),
      input: { description, customer, country, url: url || undefined },
      status: "running",
      progress: ["keywords"],
      dataMode: "SAMPLE",
    },
  });
  await executeResearch(created.id);
  return redirectTo(request, `/research/${created.id}`);
}
