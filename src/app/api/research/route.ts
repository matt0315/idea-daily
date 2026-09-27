import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, canConsume } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { isCacheFresh, meterCost, sharedCacheKey } from "@/lib/community/policy";
import { releaseDelayDays } from "@/lib/community/settings";
import { executeResearch } from "@/lib/research-job";
import { consumeMeter, meterUsed } from "@/lib/usage";

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
  const cacheKey = sharedCacheKey([description, country]);
  const cached = await db.researchCache.findUnique({ where: { cacheKey } });
  const windowDays = await releaseDelayDays(db);
  const fresh = Boolean(cached && isCacheFresh(cached.fetchedAt, new Date(), windowDays));
  if (meterCost(fresh) === 1) {
    const used = await meterUsed(user.id, "research");
    if (!canConsume(plan, "research", used)) return redirectTo(request, "/research?quota=1");
    const gate = await consumeMeter(user.id, plan, "research");
    if (!gate.ok) return redirectTo(request, "/research?quota=1");
  }
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
