import type { PrismaClient } from "@prisma/client";
import { runAutocompleteNightly } from "../autocomplete/nightly";
import { insertQueuedIdea } from "../autocomplete/queue";
import { clusterSignals, selectCandidates } from "./cluster";
import { harvestAll } from "./harvest";
import { fillIdeaTemplate } from "./write";

export async function runDailyPipeline(db: PrismaClient): Promise<{ queued: number; sample: boolean; runId: string }> {
  const { signals, anySample } = await harvestAll();
  const clusters = clusterSignals(signals);
  const candidates = selectCandidates(clusters, 8);
  const ideas = candidates.map((candidate) => fillIdeaTemplate(candidate));

  let queued = 0;
  for (const idea of ideas) {
    if (await insertQueuedIdea(db, idea)) queued += 1;
  }

  let alphabet = { queued: 0, sample: true, niches: [] as string[] };
  try {
    alphabet = await runAutocompleteNightly(db);
  } catch (error) {
    alphabet = { queued: 0, sample: true, niches: [error instanceof Error ? error.message : "autocomplete failed"] };
  }

  const run = await db.pipelineRun.create({
    data: {
      kind: "daily-pipeline",
      status: "completed",
      dataMode: anySample || alphabet.sample ? "SAMPLE" : "LIVE",
      log: {
        signalCount: signals.length,
        sampleSignals: signals.filter((signal) => signal.sample).length,
        clusterCount: clusters.length,
        queuedTitles: ideas.map((idea) => idea.title),
        queued,
        autocompleteQueued: alphabet.queued,
        autocompleteNiches: alphabet.niches,
      },
    },
  });

  return { queued: queued + alphabet.queued, sample: anySample || alphabet.sample, runId: run.id };
}
