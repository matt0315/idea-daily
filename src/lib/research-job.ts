import { Prisma } from "@prisma/client";
import { anonymizeText } from "./community/anonymize";
import { isCacheFresh, sharedCacheKey } from "./community/policy";
import { releaseDelayDays } from "./community/settings";
import { db } from "./db";
import { harvestWebSearch } from "./pipeline/harvest";
import { readProfile } from "./profile";
import { buildResearchReport, type ResearchInput, type ResearchReport } from "./research";

export async function executeResearch(reportId: string) {
  const existing = await db.researchReport.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!existing) return { ok: false as const };
  if (existing.status === "complete" && existing.report) return { ok: true as const, id: reportId };

  const input = existing.input as ResearchInput;
  const profile = readProfile(existing.user.founderProfile);
  const cacheKey = sharedCacheKey([input.description, input.country || "US"]);
  const windowDays = await releaseDelayDays(db);
  const cached = await db.researchCache.findUnique({ where: { cacheKey } });
  const cacheHit = Boolean(cached && isCacheFresh(cached.fetchedAt, new Date(), windowDays));
  let competitors: ResearchReport["competitors"] = cacheHit && Array.isArray(cached?.competitors) ? (cached.competitors as ResearchReport["competitors"]) : [];
  if (!cacheHit) {
    const signals = await harvestWebSearch(`${input.description} competitors`);
    const liveSignals = signals.filter((signal) => !signal.sample);
    competitors = liveSignals.slice(0, 8).map((signal) => ({
      name: anonymizeText(signal.title),
      url: signal.url,
      note: "Search result. Positioning and price were not extracted automatically.",
      sample: false,
    }));
    await db.researchCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        country: input.country || "US",
        competitors: competitors as unknown as Prisma.InputJsonValue,
        dataMode: competitors.length > 0 ? "LIVE" : "SAMPLE",
        fetchedAt: new Date(),
      },
      update: {
        competitors: competitors as unknown as Prisma.InputJsonValue,
        dataMode: competitors.length > 0 ? "LIVE" : "SAMPLE",
        fetchedAt: new Date(),
      },
    });
  }
  const report = buildResearchReport(input, profile, competitors.length > 0 ? { competitors } : undefined);
  if (cacheHit && competitors.length > 0) {
    report.sources.push({
      id: report.sources.length + 1,
      title: "Shared research cache",
      url: "/privacy",
      note: "Competitor URLs were reused from a recent search for the same description and country. The other account is not identified.",
      sample: false,
    });
  }

  await db.researchReport.update({
    where: { id: reportId },
    data: {
      status: "complete",
      report,
      verdict: report.verdict,
      confidence: report.confidence,
      dataMode: report.dataMode,
      progress: ["keywords", "demand", "competition", "voice", "sizing", "verdict"],
    },
  });
  return { ok: true as const, id: reportId };
}
