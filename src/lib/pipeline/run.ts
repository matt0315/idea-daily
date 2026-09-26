import { Prisma, type PrismaClient } from "@prisma/client";
import { clusterSignals, selectCandidates } from "./cluster";
import { harvestAll } from "./harvest";
import { fillIdeaTemplate } from "./write";

export async function runDailyPipeline(db: PrismaClient): Promise<{ queued: number; sample: boolean; runId: string }> {
  const { signals, anySample } = await harvestAll();
  const clusters = clusterSignals(signals);
  const candidates = selectCandidates(clusters, 8);
  const ideas = candidates.map((candidate) => fillIdeaTemplate(candidate));

  for (const idea of ideas) {
    const existing = await db.idea.findUnique({ where: { slug: idea.slug } });
    if (existing) continue;
    await db.idea.create({
      data: {
        slug: idea.slug,
        title: idea.title,
        summary: idea.summary,
        status: "QUEUED",
        dataMode: idea.dataMode,
        tags: idea.tags as Prisma.InputJsonValue,
        pitch: idea.pitch,
        keyword: idea.keyword,
        keywordVolume: idea.keywordVolume,
        keywordGrowth: idea.keywordGrowth,
        keywordCountry: idea.keywordCountry,
        keywordSeries: idea.keywordSeries as Prisma.InputJsonValue,
        keywordAsOf: idea.keywordAsOf,
        keywordSource: idea.keywordSource,
        scores: idea.scores as Prisma.InputJsonValue,
        businessFit: idea.businessFit as Prisma.InputJsonValue,
        community: idea.community as Prisma.InputJsonValue,
        offerLadder: idea.offerLadder as Prisma.InputJsonValue,
        whyNow: idea.whyNow,
        proof: idea.proof,
        marketGap: idea.marketGap,
        executionPlan: idea.executionPlan,
        frameworks: idea.frameworks as Prisma.InputJsonValue,
        requirements: idea.requirements as Prisma.InputJsonValue,
        sources: idea.sources as Prisma.InputJsonValue,
        buildBrief: idea.buildBrief as Prisma.InputJsonValue,
        category: idea.category,
        market: idea.market,
        difficulty: idea.difficulty,
        capitalBand: idea.capitalBand,
        opportunity: idea.opportunity,
        pain: idea.pain,
        buildability: idea.buildability,
        timing: idea.timing,
        growth: idea.growth,
      },
    });
  }

  const run = await db.pipelineRun.create({
    data: {
      kind: "daily-pipeline",
      status: "completed",
      dataMode: anySample ? "SAMPLE" : "LIVE",
      log: {
        signalCount: signals.length,
        sampleSignals: signals.filter((signal) => signal.sample).length,
        clusterCount: clusters.length,
        queuedTitles: ideas.map((idea) => idea.title),
      },
    },
  });

  return { queued: ideas.length, sample: anySample, runId: run.id };
}
