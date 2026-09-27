import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, canConsume } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { Prisma } from "@prisma/client";
import { isCacheFresh, meterCost, sharedCacheKey } from "@/lib/community/policy";
import { releaseDelayDays } from "@/lib/community/settings";
import { harvestSearchVolume } from "@/lib/pipeline/harvest";
import { applyLiveVolumes, researchSeedTerms, type TrendResearchResult } from "@/lib/trend-research";
import { consumeMeter, meterUsed } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/trends/research");
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "trends.research")) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const seed = String(form.get("seed") || "").trim();
  const country = String(form.get("country") || "US");
  if (seed.length < 2) return redirectTo(request, "/trends/research");
  const cacheKey = sharedCacheKey([seed, country]);
  const windowDays = await releaseDelayDays(db);
  const cached = await db.trendCache.findUnique({ where: { cacheKey } });
  const fresh = Boolean(cached && isCacheFresh(cached.fetchedAt, new Date(), windowDays));
  if (meterCost(fresh) === 1) {
    const used = await meterUsed(user.id, "trendResearch");
    if (!canConsume(plan, "trendResearch", used)) return redirectTo(request, "/trends/research?quota=1");
  }

  let result: TrendResearchResult;
  if (fresh && cached) {
    result = cached.result as TrendResearchResult;
  } else {
    result = researchSeedTerms(seed, country);
    const volumes = await harvestSearchVolume(result.rows.map((row) => row.keyword));
    const live = volumes.filter((signal) => !signal.sample);
    if (live.length > 0) {
      result = applyLiveVolumes(
        result,
        live.map((signal) => {
          const match = signal.text.match(/volume\s+(\d+)/i);
          const volume = match ? Number(match[1]) : 0;
          return { keyword: signal.title, series: volume ? [volume] : [] };
        }),
      );
    }
    await db.trendCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        seed: result.seed,
        country,
        result: result as unknown as Prisma.InputJsonValue,
        dataMode: result.dataMode,
        fetchedAt: new Date(),
      },
      update: {
        result: result as unknown as Prisma.InputJsonValue,
        dataMode: result.dataMode,
        fetchedAt: new Date(),
      },
    });
    const gate = await consumeMeter(user.id, plan, "trendResearch");
    if (!gate.ok) return redirectTo(request, "/trends/research?quota=1");
  }

  const saved = await db.trendQuery.create({
    data: { userId: user.id, seed, country, result, dataMode: result.dataMode },
  });
  return redirectTo(request, `/trends/research/${saved.id}`);
}
