import { releaseCommunityWork } from "@/lib/community/release";
import { db } from "@/lib/db";
import { publishNextApproved } from "@/lib/publish";
import { runDailyPipeline } from "@/lib/pipeline/run";
import { refreshTrends } from "@/lib/pipeline/trends-job";
import { executeResearch } from "@/lib/research-job";
import { inngest } from "./client";

export const dailyPipeline = inngest.createFunction(
  { id: "daily-idea-pipeline" },
  { cron: "0 22 * * *" },
  async () => runDailyPipeline(db),
);

export const publishApproved = inngest.createFunction(
  { id: "publish-approved-idea" },
  { cron: "5 22 * * *" },
  async () => publishNextApproved(),
);

export const nightlyTrends = inngest.createFunction(
  { id: "nightly-trends" },
  { cron: "30 21 * * *" },
  async () => refreshTrends(db),
);

export const communityRelease = inngest.createFunction(
  { id: "community-release" },
  { cron: "15 22 * * *" },
  async () => releaseCommunityWork(db),
);

export const researchRun = inngest.createFunction(
  { id: "research-run" },
  { event: "app/research.requested" },
  async ({ event }) => executeResearch(String((event.data as { reportId?: string }).reportId || "")),
);

export const functions = [dailyPipeline, publishApproved, nightlyTrends, communityRelease, researchRun];
