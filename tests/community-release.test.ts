import { describe, expect, it } from "vitest";
import type { GroupedSuggestions } from "../src/lib/autocomplete/cluster";
import type { MinedDraft } from "../src/lib/autocomplete/ideas";
import type { SearchEvidence } from "../src/lib/autocomplete/evidence";
import { anonymizeText, containsPersonalKeys, isPublicSafe, leaksSecrets } from "../src/lib/community/anonymize";
import { cosineSimilarity, dedupMatch, mergeEvidence, parseVector, titleSimilarity } from "../src/lib/community/dedupe";
import { planMineRelease, planTextRelease, withCommunityTag } from "../src/lib/community/plan";
import {
  COMMUNITY_SOURCE,
  DAY_MS,
  DEFAULT_RELEASE_DAYS,
  isCacheFresh,
  isDueForRelease,
  meterCost,
  releaseAllowed,
  sharedCacheKey,
  shouldRelease,
} from "../src/lib/community/policy";

const NOW = new Date("2026-09-26T12:00:00.000Z");

function daysAgo(days: number, extraMs = 0): Date {
  return new Date(NOW.getTime() - days * DAY_MS - extraMs);
}

const emptyGroups: GroupedSuggestions = { questions: [], problems: [], desires: [] };

function draft(overrides: Partial<MinedDraft> = {}): MinedDraft {
  return {
    title: "Deposit reminder checklist",
    summary: "A one-page checklist for deposits.",
    productType: "checklist",
    productLabel: "Checklist",
    ideaType: "DIGITAL",
    searches: ["best deposit reminder checklist", "deposit reminder checklist for jobs"],
    clusterId: "cluster-1",
    clusterLabel: "deposit reminder checklist",
    clusterKind: "desire",
    scores: { opportunity: 1, pain: 1, buildability: 1, timing: 1 },
    ...overrides,
  };
}

function mineMeta(overrides: Partial<Parameters<typeof planMineRelease>[0]> = {}) {
  return {
    id: "mine-1",
    createdAt: daysAgo(8),
    releasedAt: null,
    plan: "BUILDER" as const,
    optOut: false,
    secrets: ["Ada Lovelace", "ada@clinic.test", "Northwind Clinic OS"],
    niche: "vet clinic",
    country: "AU",
    language: "en",
    dataMode: "SAMPLE" as const,
    provider: "sample",
    groups: emptyGroups,
    ideas: [draft()],
    ...overrides,
  };
}

describe("community release timing", () => {
  it("keeps a mine private until the window has fully elapsed", () => {
    expect(DEFAULT_RELEASE_DAYS).toBe(7);
    expect(isDueForRelease(daysAgo(6), NOW, 7)).toBe(false);
    expect(isDueForRelease(daysAgo(7, -1), NOW, 7)).toBe(false);
    expect(isDueForRelease(daysAgo(7), NOW, 7)).toBe(true);
    expect(isDueForRelease(daysAgo(8), NOW, 7)).toBe(true);
    expect(isDueForRelease(daysAgo(10), NOW, 14)).toBe(false);
    expect(isDueForRelease(daysAgo(14), NOW, 14)).toBe(true);

    const early = planMineRelease(mineMeta({ createdAt: daysAgo(6) }), [], NOW, 7);
    expect(early).toEqual([{ type: "skip", id: "mine-1", reason: "not-due" }]);

    const due = planMineRelease(mineMeta({ createdAt: daysAgo(7) }), [], NOW, 7);
    expect(due.some((action) => action.type === "create")).toBe(true);
    expect(due.some((action) => action.type === "mark" && action.kind === "mine")).toBe(true);

    const custom = planMineRelease(mineMeta({ createdAt: daysAgo(10) }), [], NOW, 14);
    expect(custom).toEqual([{ type: "skip", id: "mine-1", reason: "not-due" }]);
  });

  it("skips a Pro opt-out and an already released run, and ignores Builder opt-out", () => {
    expect(releaseAllowed("PRO", true)).toBe(false);
    expect(releaseAllowed("PRO", false)).toBe(true);
    expect(releaseAllowed("BUILDER", true)).toBe(true);
    expect(releaseAllowed("FREE", true)).toBe(true);

    expect(shouldRelease({ createdAt: daysAgo(8), releasedAt: NOW, plan: "BUILDER", optOut: false }, NOW, 7)).toBe(false);
    expect(planMineRelease(mineMeta({ releasedAt: NOW }), [], NOW, 7)).toEqual([{ type: "skip", id: "mine-1", reason: "already" }]);
    expect(planMineRelease(mineMeta({ plan: "PRO", optOut: true }), [], NOW, 7)).toEqual([{ type: "skip", id: "mine-1", reason: "opt-out" }]);

    const builder = planMineRelease(mineMeta({ plan: "BUILDER", optOut: true }), [], NOW, 7);
    expect(builder.some((action) => action.type === "create")).toBe(true);
    expect(builder.some((action) => action.type === "mark")).toBe(true);
  });
});

describe("community de-dupe and merge", () => {
  it("matches the same niche and cluster before title or embedding checks", () => {
    const match = dedupMatch(
      [{ id: "idea-9", title: "Unrelated linen tracker", niche: "Vet Clinic", cluster: "Deposit Reminder Checklist" }],
      { id: "", title: "A completely different product name", niche: "vet clinic", cluster: "deposit reminder checklist" },
    );
    expect(match?.id).toBe("idea-9");

    const planned = planMineRelease(mineMeta(), [
      { id: "idea-9", title: "Unrelated linen tracker", niche: "vet clinic", cluster: "deposit reminder checklist" },
    ], NOW, 7);
    const merge = planned.find((action) => action.type === "merge");
    expect(merge).toMatchObject({ type: "merge", ideaId: "idea-9" });
    expect(planned.some((action) => action.type === "create")).toBe(false);
  });

  it("matches similar titles and leaves dissimilar titles alone", () => {
    const similar = titleSimilarity(
      "Residential electrician deposit reminder checklist",
      "Residential electrician deposit reminder checklists",
    );
    expect(similar).toBeGreaterThanOrEqual(0.62);
    const match = dedupMatch(
      [{ id: "idea-2", title: "Residential electrician deposit reminder checklist", niche: "other niche", cluster: "other cluster" }],
      { id: "", title: "Residential electrician deposit reminder checklists", niche: "fresh niche", cluster: "fresh cluster" },
    );
    expect(match?.id).toBe("idea-2");

    expect(titleSimilarity("Boutique hotel linen tracker", "Vet clinic appointment reminder")).toBe(0);
    expect(dedupMatch(
      [{ id: "idea-3", title: "Boutique hotel linen tracker", niche: "hotels", cluster: "linen" }],
      { id: "", title: "Vet clinic appointment reminder", niche: "clinics", cluster: "appointments" },
    )).toBeNull();
  });

  it("uses cosine when both embeddings exist and falls back to lexical when they do not", () => {
    const left = [1, 0, 0];
    const right = [0.99, 0.1, 0];
    expect(cosineSimilarity(left, right)).toBeGreaterThanOrEqual(0.88);
    expect(cosineSimilarity(left, [])).toBeNull();
    expect(parseVector("[1, 0, 0]")).toEqual([1, 0, 0]);
    expect(parseVector(null)).toBeNull();

    const embedded = dedupMatch(
      [{ id: "idea-vec", title: "Boutique hotel linen tracker", niche: "hotels", cluster: "linen", embedding: left }],
      { id: "", title: "Vet clinic appointment reminder", niche: "clinics", cluster: "appointments", embedding: right },
    );
    expect(embedded?.id).toBe("idea-vec");

    const missing = dedupMatch(
      [{ id: "idea-lex", title: "Residential electrician deposit reminder checklist", niche: "trades", cluster: "quotes", embedding: null }],
      { id: "", title: "Residential electrician deposit reminder checklists", niche: "fresh", cluster: "other", embedding: null },
    );
    expect(missing?.id).toBe("idea-lex");

    const oneSided = dedupMatch(
      [{ id: "idea-none", title: "Boutique hotel linen tracker", niche: "hotels", cluster: "linen", embedding: left }],
      { id: "", title: "Vet clinic appointment reminder", niche: "clinics", cluster: "appointments", embedding: null },
    );
    expect(oneSided).toBeNull();
  });

  it("merges new phrases into existing evidence without personal fields", () => {
    const existing: SearchEvidence = {
      niche: "vet clinic",
      country: "AU",
      language: "en",
      source: "sample",
      dataMode: "SAMPLE",
      asOf: "2026-09-01",
      note: "Original sample phrases.",
      suggestions: [{ text: "best deposit reminder checklist", kind: "desire", cluster: "deposit reminder checklist" }],
      volume: 120,
      volumeNote: "Measured earlier.",
    };
    const incoming: SearchEvidence = {
      niche: "vet clinic",
      country: "AU",
      language: "en",
      source: COMMUNITY_SOURCE,
      dataMode: "LIVE",
      asOf: "2026-09-18",
      note: "New phrases.",
      suggestions: [
        { text: "Best Deposit Reminder Checklist", kind: "desire", cluster: "deposit reminder checklist" },
        { text: "deposit reminder checklist for jobs", kind: "desire", cluster: "deposit reminder checklist" },
      ],
      volume: 999,
      volumeNote: "Should not replace the stored volume.",
    };
    const merged = mergeEvidence(existing, incoming);
    expect(merged.suggestions.map((item) => item.text)).toEqual([
      "best deposit reminder checklist",
      "deposit reminder checklist for jobs",
    ]);
    expect(merged.volume).toBe(120);
    expect(merged.volumeNote).toBe("Measured earlier.");
    expect(merged.note).toContain("2026-09-18");
    expect(JSON.stringify(merged)).not.toMatch(/userId|ada@clinic|Ada Lovelace|Northwind/i);
    expect(withCommunityTag(["Needs review"])).toEqual([COMMUNITY_SOURCE, "Needs review"]);
  });
});

describe("community anonymisation", () => {
  it("strips emails, names, and project titles before a draft can be public", () => {
    const cleaned = anonymizeText(
      "Ada Lovelace built Northwind Clinic OS. Contact ada@clinic.test or +61 400 111 222.",
      ["Ada Lovelace", "Northwind Clinic OS", "ada@clinic.test"],
    );
    expect(cleaned.toLowerCase()).not.toContain("ada lovelace");
    expect(cleaned.toLowerCase()).not.toContain("northwind");
    expect(cleaned).not.toContain("@");
    expect(cleaned).not.toMatch(/400/);

    const leak = { userId: "user-1", email: "ada@clinic.test", privateNotes: "secret" };
    expect(containsPersonalKeys(leak)).toBe(true);
    expect(isPublicSafe(leak, [])).toBe(false);
    expect(leaksSecrets({ title: "Northwind Clinic OS reminder" }, ["Northwind Clinic OS"])).toBe(true);

    const planned = planMineRelease(mineMeta({
      ideas: [draft({
        title: "Ada Lovelace deposit reminder checklist",
        summary: "Built for Northwind Clinic OS. Email ada@clinic.test.",
        searches: ["best deposit reminder checklist", "email ada@clinic.test about deposits"],
      })],
    }), [], NOW, 7);
    const created = planned.find((action) => action.type === "create");
    expect(created?.type).toBe("create");
    if (created?.type !== "create") return;
    const blob = JSON.stringify(created);
    expect(blob.toLowerCase()).not.toContain("ada lovelace");
    expect(blob.toLowerCase()).not.toContain("northwind");
    expect(blob).not.toContain("ada@clinic.test");
    expect(blob).not.toMatch(/userId|founderProfile|projectName|privateNotes/);
    expect(created.draft.minedOn).toBe("2026-09-18");
    expect(created.evidence.source).toBe(COMMUNITY_SOURCE);
    expect(created.evidence.asOf).toBe("2026-09-18");
    expect(isPublicSafe(created, mineMeta().secrets)).toBe(true);
  });

  it("strips a named buyer out of a research draft", () => {
    const planned = planTextRelease({
      id: "report-1",
      kind: "research",
      createdAt: daysAgo(8),
      releasedAt: null,
      plan: "PRO",
      optOut: false,
      secrets: ["Ada Lovelace", "ada@clinic.test"],
      title: "Reminder software for clinics",
      summary: "Ada Lovelace at ada@clinic.test wants a reminder tool.",
      niche: "clinics",
      country: "US",
      searches: ["clinic reminder software"],
      dataMode: "SAMPLE",
    }, [], NOW, 7);
    const created = planned.find((action) => action.type === "create");
    expect(created?.type).toBe("create");
    if (created?.type !== "create") return;
    expect(created.draft.summary.toLowerCase()).not.toContain("ada lovelace");
    expect(JSON.stringify(created)).not.toContain("ada@clinic.test");
    expect(JSON.stringify(created)).not.toMatch(/userId|founderProfile|projectTitle/);
  });
});

describe("shared cache hits", () => {
  it("charges a full credit on a miss and nothing on a hit", () => {
    expect(meterCost(false)).toBe(1);
    expect(meterCost(true)).toBe(0);
  });

  it("treats the exact window boundary as a cache miss", () => {
    expect(isCacheFresh(daysAgo(6), NOW, 7)).toBe(true);
    expect(isCacheFresh(daysAgo(7, -1), NOW, 7)).toBe(true);
    expect(isCacheFresh(daysAgo(7), NOW, 7)).toBe(false);
    expect(isCacheFresh(daysAgo(8), NOW, 7)).toBe(false);
  });

  it("normalizes niche, country, and language into one cache key", () => {
    expect(sharedCacheKey(["  Vet   Clinic ", "AU", "EN"])).toBe("vet clinic|au|en");
    expect(sharedCacheKey(["vet clinic", "au", "en"])).toBe(sharedCacheKey(["VET CLINIC", " AU ", "En"]));
  });
});
