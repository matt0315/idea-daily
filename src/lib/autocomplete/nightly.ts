import type { PrismaClient } from "@prisma/client";
import { topClusters, type GroupedSuggestions } from "./cluster";
import { draftIdeas, mineNiche } from "./mine";
import { productForCluster } from "./ideas";
import { builtIdeaFromMine, insertQueuedIdea } from "./queue";

export type SeedRow = {
  niche: string;
  country: string;
  active: boolean;
  lastRunAt: Date | null;
};

/** Active seeds that have never run come first, then the oldest run. */
export function selectSeedsForRun<T extends SeedRow>(seeds: T[], limit: number): T[] {
  return seeds
    .filter((seed) => seed.active)
    .sort((a, b) => {
      if (a.lastRunAt == null && b.lastRunAt != null) return -1;
      if (a.lastRunAt != null && b.lastRunAt == null) return 1;
      if (a.lastRunAt == null && b.lastRunAt == null) return a.niche.localeCompare(b.niche);
      const delta = a.lastRunAt!.getTime() - b.lastRunAt!.getTime();
      if (delta !== 0) return delta;
      return a.niche.localeCompare(b.niche);
    })
    .slice(0, Math.max(0, limit));
}

export function seedsPerNight(): number {
  const parsed = Number(process.env.AUTOCOMPLETE_SEEDS_PER_NIGHT ?? "3");
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return Math.min(12, Math.floor(parsed));
}

export async function runAutocompleteNightly(db: PrismaClient): Promise<{ queued: number; sample: boolean; niches: string[] }> {
  const seeds = await db.autocompleteSeed.findMany();
  const picked = selectSeedsForRun(seeds, seedsPerNight());
  let queued = 0;
  let sample = picked.length === 0;
  const niches: string[] = [];

  for (const seed of picked) {
    const mined = await mineNiche(db, { niche: seed.niche, country: seed.country, language: seed.language });
    niches.push(`${mined.niche} (${mined.country})`);
    if (mined.dataMode === "SAMPLE") sample = true;
    const clusters = topClusters(mined.groups as GroupedSuggestions, 2);
    for (const cluster of clusters) {
      const product = productForCluster(cluster);
      const drafted = await draftIdeas(mined.niche, cluster, product);
      const draft = drafted.ideas[0];
      if (!draft) continue;
      const idea = builtIdeaFromMine({
        draft,
        cluster,
        niche: mined.niche,
        country: mined.country,
        language: mined.language,
        source: mined.source,
        dataMode: mined.dataMode,
        note: mined.note,
      });
      const created = await insertQueuedIdea(db, idea, { skipSameTitle: true });
      if (created) queued += 1;
    }
    await db.autocompleteSeed.update({ where: { id: seed.id }, data: { lastRunAt: new Date() } });
  }

  await db.pipelineRun.create({
    data: {
      kind: "autocomplete",
      status: "completed",
      dataMode: sample ? "SAMPLE" : "LIVE",
      log: { queued, niches },
    },
  });

  return { queued, sample, niches };
}
