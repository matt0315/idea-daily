import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { harvestSearchVolume } from "@/lib/pipeline/harvest";
import { applyLiveVolumes, researchSeedTerms } from "@/lib/trend-research";
import { consumeMeter } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/trends/research");
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "trends.research")) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const seed = String(form.get("seed") || "").trim();
  const country = String(form.get("country") || "US");
  if (seed.length < 2) return redirectTo(request, "/trends/research");
  const gate = await consumeMeter(user.id, plan, "trendResearch");
  if (!gate.ok) return redirectTo(request, "/trends/research?quota=1");

  let result = researchSeedTerms(seed, country);
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

  const saved = await db.trendQuery.create({
    data: { userId: user.id, seed, country, result, dataMode: result.dataMode },
  });
  return redirectTo(request, `/trends/research/${saved.id}`);
}
