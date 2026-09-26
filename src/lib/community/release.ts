import { Prisma, type PrismaClient } from "@prisma/client";
import { asGroups, readDrafts } from "../autocomplete/mine";
import { productById } from "../autocomplete/ideas";
import { builtIdeaFromMine, insertQueuedIdea } from "../autocomplete/queue";
import { isSearchEvidence, type SearchEvidence } from "../autocomplete/evidence";
import type { TrendResearchResult } from "../trend-research";
import { asPlan } from "../auth";
import { anonymizeText } from "./anonymize";
import { mergeEvidence, parseVector, type DedupRow } from "./dedupe";
import { planMineRelease, planTextRelease, withCommunityTag, type ReleaseAction } from "./plan";
import { COMMUNITY_SOURCE } from "./policy";
import { releaseDelayDays } from "./settings";

type ExistingIdea = DedupRow & { evidence: SearchEvidence | null; tags: string[] };

async function loadExisting(db: PrismaClient): Promise<ExistingIdea[]> {
  const ideas = await db.idea.findMany({
    where: { status: { in: ["CANDIDATE", "QUEUED", "APPROVED", "PUBLISHED"] } },
    select: { id: true, title: true, keyword: true, tags: true, searchEvidence: true },
  });
  const vectors = new Map<string, number[]>();
  try {
    const rows = await db.$queryRaw<{ id: string; embedding: string | null }[]>`
      SELECT id, embedding::text AS embedding FROM "Idea" WHERE embedding IS NOT NULL
    `;
    for (const row of rows) {
      const parsed = parseVector(row.embedding);
      if (parsed) vectors.set(row.id, parsed);
    }
  } catch {
    // No embeddings stored, or the vector cast is unavailable. Lexical matching still runs.
  }
  return ideas.map((idea) => {
    const evidence = isSearchEvidence(idea.searchEvidence) ? idea.searchEvidence : null;
    const tags = Array.isArray(idea.tags) ? idea.tags.filter((tag): tag is string => typeof tag === "string") : [];
    return {
      id: idea.id,
      title: idea.title,
      niche: evidence?.niche || idea.keyword,
      cluster: evidence?.suggestions[0]?.cluster || "",
      embedding: vectors.get(idea.id) ?? null,
      evidence,
      tags,
    };
  });
}

function secretsFor(user: { email: string; name: string | null }): string[] {
  return [user.email, user.name || ""].filter((value) => value.trim().length >= 3);
}

async function applyActions(db: PrismaClient, actions: ReleaseAction[], existing: ExistingIdea[]): Promise<{ created: number; merged: number }> {
  let created = 0;
  let merged = 0;
  for (const action of actions) {
    if (action.type === "create") {
      const idea = builtIdeaFromMine({
        draft: {
          title: action.draft.title,
          summary: action.draft.summary,
          productType: productById(action.draft.productType).id,
          productLabel: productById(action.draft.productType).label,
          ideaType: action.draft.ideaType,
          searches: action.draft.searches,
          clusterId: "community",
          clusterLabel: action.draft.cluster,
          clusterKind: action.draft.clusterKind,
          scores: { opportunity: 1, pain: 1, buildability: 1, timing: 1 },
        },
        cluster: {
          id: "community",
          kind: action.draft.clusterKind,
          label: action.draft.cluster,
          suggestions: action.draft.searches.map((text) => ({ text, query: COMMUNITY_SOURCE })),
          count: action.draft.searches.length,
          volume: null,
        },
        niche: action.draft.niche,
        country: action.draft.country,
        language: action.draft.language,
        source: action.draft.provider,
        dataMode: action.draft.dataMode,
        note: action.evidence.note,
      });
      idea.tags = [COMMUNITY_SOURCE, "Needs review", ...idea.tags.filter((tag) => tag !== "Needs review")];
      idea.searchEvidence = action.evidence;
      idea.keywordSource = `${idea.keywordSource} Queued from an anonymised ${COMMUNITY_SOURCE} dated ${action.draft.minedOn}.`;
      const inserted = await insertQueuedIdea(db, idea, { skipSameTitle: true });
      if (inserted) {
        created += 1;
        const row = await db.idea.findUnique({ where: { slug: idea.slug }, select: { id: true } });
        existing.push({
          id: row?.id || idea.slug,
          title: idea.title,
          niche: action.draft.niche,
          cluster: action.draft.cluster,
          evidence: action.evidence,
          tags: idea.tags,
        });
      }
    }
    if (action.type === "merge") {
      const current = existing.find((idea) => idea.id === action.ideaId);
      const evidence = mergeEvidence(current?.evidence ?? null, action.evidence);
      const tags = withCommunityTag(current?.tags ?? []);
      await db.idea.update({
        where: { id: action.ideaId },
        data: {
          searchEvidence: evidence as unknown as Prisma.InputJsonValue,
          tags: tags as Prisma.InputJsonValue,
        },
      });
      if (current) {
        current.evidence = evidence;
        current.tags = tags;
      }
      merged += 1;
    }
    if (action.type === "mark") {
      const data = { releasedAt: new Date() };
      if (action.kind === "mine") await db.autocompleteMine.update({ where: { id: action.id }, data });
      if (action.kind === "research") await db.researchReport.update({ where: { id: action.id }, data });
      if (action.kind === "trend") await db.trendQuery.update({ where: { id: action.id }, data });
    }
  }
  return { created, merged };
}

export async function releaseCommunityWork(db: PrismaClient, now = new Date()): Promise<{
  created: number;
  merged: number;
  skipped: number;
  delayDays: number;
}> {
  const delayDays = await releaseDelayDays(db);
  const cutoff = new Date(now.getTime() - delayDays * 24 * 60 * 60 * 1000);
  const existing = await loadExisting(db);
  let created = 0;
  let merged = 0;
  let skipped = 0;

  const mines = await db.autocompleteMine.findMany({
    where: { releasedAt: null, createdAt: { lte: cutoff } },
    include: { user: { select: { email: true, name: true, plan: true, communityReleaseOptOut: true } } },
  });
  for (const mine of mines) {
    const planned = planMineRelease(
      {
        id: mine.id,
        createdAt: mine.createdAt,
        releasedAt: mine.releasedAt,
        plan: asPlan(mine.user.plan),
        optOut: mine.user.communityReleaseOptOut,
        secrets: secretsFor(mine.user),
        niche: mine.niche,
        country: mine.country,
        language: mine.language,
        dataMode: mine.dataMode,
        provider: mine.source,
        groups: asGroups(mine.groups),
        ideas: readDrafts(mine.ideas),
      },
      existing,
      now,
      delayDays,
    );
    skipped += planned.filter((action) => action.type === "skip").length;
    const applied = await applyActions(db, planned, existing);
    created += applied.created;
    merged += applied.merged;
  }

  const reports = await db.researchReport.findMany({
    where: { releasedAt: null, status: "complete", createdAt: { lte: cutoff } },
    include: { user: { select: { email: true, name: true, plan: true, communityReleaseOptOut: true } } },
  });
  for (const report of reports) {
    const input = report.input as { description?: string; country?: string };
    const title = anonymizeText(input.description || report.title, secretsFor(report.user));
    const planned = planTextRelease(
      {
        id: report.id,
        kind: "research",
        createdAt: report.createdAt,
        releasedAt: report.releasedAt,
        plan: asPlan(report.user.plan),
        optOut: report.user.communityReleaseOptOut,
        secrets: secretsFor(report.user),
        title: title || "Community research idea",
        summary: `Anonymised Idea Agent run dated ${report.createdAt.toISOString().slice(0, 10)}. The private buyer line and founder profile were not copied.`,
        niche: title || report.title,
        country: input.country || "US",
        searches: [title || report.title],
        dataMode: report.dataMode,
      },
      existing,
      now,
      delayDays,
    );
    skipped += planned.filter((action) => action.type === "skip").length;
    const applied = await applyActions(db, planned, existing);
    created += applied.created;
    merged += applied.merged;
  }

  const trends = await db.trendQuery.findMany({
    where: { releasedAt: null, createdAt: { lte: cutoff }, userId: { not: null } },
    include: { user: { select: { email: true, name: true, plan: true, communityReleaseOptOut: true } } },
  });
  for (const query of trends) {
    if (!query.user) continue;
    const result = query.result as TrendResearchResult;
    const phrases = Array.isArray(result?.rows) ? result.rows.map((row) => row.keyword).filter(Boolean) : [];
    const planned = planTextRelease(
      {
        id: query.id,
        kind: "trend",
        createdAt: query.createdAt,
        releasedAt: query.releasedAt,
        plan: asPlan(query.user.plan),
        optOut: query.user.communityReleaseOptOut,
        secrets: secretsFor(query.user),
        title: anonymizeText(query.seed, secretsFor(query.user)) || query.seed,
        summary: `Anonymised trends research dated ${query.createdAt.toISOString().slice(0, 10)}. Related phrases only. No account is attached.`,
        niche: query.seed,
        country: query.country,
        searches: phrases.length > 0 ? phrases : [query.seed],
        dataMode: query.dataMode,
      },
      existing,
      now,
      delayDays,
    );
    skipped += planned.filter((action) => action.type === "skip").length;
    const applied = await applyActions(db, planned, existing);
    created += applied.created;
    merged += applied.merged;
  }

  await db.pipelineRun.create({
    data: {
      kind: "community-release",
      status: "completed",
      dataMode: "SAMPLE",
      log: { created, merged, skipped, delayDays, considered: mines.length + reports.length + trends.length },
    },
  });
  return { created, merged, skipped, delayDays };
}
