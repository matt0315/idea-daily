import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, canConsume } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { mineNiche, sharedMineIsFresh } from "@/lib/autocomplete/mine";
import { meterCost } from "@/lib/community/policy";
import { meterUsed, consumeMeter } from "@/lib/usage";
import { Prisma } from "@prisma/client";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/build/alphabet");
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "alphabet")) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const niche = String(form.get("niche") || "");
  const country = String(form.get("country") || "US");
  const language = String(form.get("language") || "en");
  const fresh = await sharedMineIsFresh(db, { niche, country, language });
  if (!fresh) {
    const used = await meterUsed(user.id, "alphabet");
    if (!canConsume(plan, "alphabet", used)) return redirectTo(request, "/build/alphabet?error=quota");
  }
  let mined;
  try {
    mined = await mineNiche(db, { niche, country, language });
  } catch {
    return redirectTo(request, "/build/alphabet?error=niche");
  }
  if (meterCost(mined.cacheHit) === 1) {
    const gate = await consumeMeter(user.id, plan, "alphabet");
    if (!gate.ok) return redirectTo(request, "/build/alphabet?error=quota");
  }

  const mine = await db.autocompleteMine.create({
    data: {
      userId: user.id,
      niche: mined.niche,
      country: mined.country,
      language: mined.language,
      groups: mined.groups as unknown as Prisma.InputJsonValue,
      ideas: [],
      source: mined.source,
      dataMode: mined.dataMode,
      cacheHit: mined.cacheHit,
    },
  });
  return redirectTo(request, `/build/alphabet/${mine.id}`);
}
