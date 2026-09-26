import { describe, expect, it } from "vitest";
import { clusterSignals, selectCandidates, type Signal } from "../src/lib/pipeline/cluster";
import { sampleSignals } from "../src/lib/pipeline/sample-signals";
import { fillIdeaTemplate } from "../src/lib/pipeline/write";
import { positionLabel } from "../src/lib/frameworks";
import { guidesForBrief } from "../src/lib/build-guides";
import { runSkill } from "../src/lib/skills";
import { buildResearchReport } from "../src/lib/research";
import { commercialIntent, filterTrendNoise, growthFromMonthlySeries, selectTrendCards } from "../src/lib/trends";

function signal(title: string, text: string, score = 50): Signal {
  return {
    source: "hackernews",
    title,
    url: "https://example.com/sample",
    text,
    score,
    capturedAt: "2026-09-26T00:00:00Z",
    sample: true,
  };
}

describe("pipeline clustering", () => {
  it("groups related signals and keeps unrelated ones apart", () => {
    const clusters = clusterSignals([
      signal("Electricians quote from photos", "electrician quote price book photo", 80),
      signal("Electrical shops want deposit quotes", "electrician quote deposit photo", 70),
      signal("Boutique hotel night audit checklist", "hotel night audit folio", 60),
    ]);
    expect(clusters.length).toBe(2);
    const electrician = clusters.find((cluster) => cluster.signals.length === 2);
    expect(electrician).toBeTruthy();
    expect(electrician?.sample).toBe(true);
  });

  it("caps the candidate list", () => {
    const signals = Array.from({ length: 25 }, (_, index) =>
      signal(`Distinct topic number ${index} alpha${index}`, `uniquekeyword${index} workflow`, 100 - index),
    );
    const candidates = selectCandidates(clusterSignals(signals, 0.99), 20);
    expect(candidates.length).toBeLessThanOrEqual(20);
    expect(candidates[0].sample).toBe(true);
  });

  it("fills the template with sample volume when nothing was measured", () => {
    const [candidate] = selectCandidates(clusterSignals(sampleSignals()), 1);
    const idea = fillIdeaTemplate(candidate);
    expect(idea.status).toBe("QUEUED");
    expect(idea.dataMode).toBe("SAMPLE");
    expect(idea.keywordVolume).toBe(1000);
    expect(idea.keywordSource.toLowerCase()).toContain("not a live measurement");
    expect(idea.sources[0].sample).toBe(true);
    expect(JSON.stringify(idea).includes("A.C.P.")).toBe(false);
  });

  it("marks volume live only when the candidate itself is live and a measurement is passed", () => {
    const [candidate] = selectCandidates(clusterSignals(sampleSignals()), 1);
    const live = fillIdeaTemplate({ ...candidate, sample: false }, { measuredVolume: 4200, measuredGrowth: 33 });
    expect(live.dataMode).toBe("LIVE");
    expect(live.keywordVolume).toBe(4200);
  });
});

describe("trends noise filter", () => {
  it("drops navigational and government queries", () => {
    expect(filterTrendNoise("CA DMV car registration").keep).toBe(false);
    expect(filterTrendNoise("register for ymca summer camp").keep).toBe(false);
    expect(filterTrendNoise("plumber near me").keep).toBe(false);
    expect(filterTrendNoise("contractor permit tracking software").keep).toBe(true);
  });

  it("ranks commercial keywords and states the growth window", () => {
    const cards = selectTrendCards([
      { keyword: "youtube", volume: 900000, growthPct: 400, category: "nav" },
      { keyword: "clinic shift handoff software", volume: 2400, growthPct: 80, category: "ops" },
      { keyword: "what is a noun", volume: 50000, growthPct: 10, category: "edu" },
    ]);
    expect(cards.map((card) => card.keyword)).toEqual(["clinic shift handoff software"]);
    expect(commercialIntent("clinic shift handoff software")).toBeGreaterThan(commercialIntent("what is a noun"));
    const series = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 20, 20];
    expect(growthFromMonthlySeries(series)).toBe(100);
    expect(growthFromMonthlySeries([1, 2, 3])).toBeNull();
  });
});

describe("build guides and skills", () => {
  const brief = {
    title: "QuoteLatch",
    slug: "quotelatch",
    oneLiner: "Photo to deposit quote for residential electricians.",
    customer: "Owners of residential electrical shops.",
    problem: "Quotes are rebuilt from a night-time text photo.",
    mvp: ["Photo inbox", "Price book", "Deposit quote"],
    stack: "Next.js, Postgres, Stripe",
    pricing: "Set after interviews.",
    outOfScope: ["Marketplace"],
  };

  it("emits a file for every build tool, including CLAUDE.md and Cursor rules", () => {
    const guides = guidesForBrief(brief);
    expect(guides).toHaveLength(8);
    const claude = guides.find((guide) => guide.tool === "claude-code");
    expect(claude?.files.some((file) => file.path === "CLAUDE.md")).toBe(true);
    const cursor = guides.find((guide) => guide.tool === "cursor");
    expect(cursor?.files.some((file) => file.path.startsWith(".cursor/rules/"))).toBe(true);
    expect(guides.every((guide) => guide.prompt.includes("QuoteLatch"))).toBe(true);
    expect(JSON.stringify(guides).includes("A.C.P.")).toBe(false);
  });

  it("chains the ship plan when run-all is selected", () => {
    const result = runSkill("run-all", { brief, weeklyHours: 12, archetype: "Systems Builder" });
    expect(result.markdown).toContain("# Offer");
    expect(result.markdown).toContain("# 7-day ship plan");
    expect(result.markdown).toContain("Kill list");
    expect(result.skills).toContain("email");
  });
});

describe("research report", () => {
  it("returns a test-first or pass verdict with footnoted sample demand", () => {
    const report = buildResearchReport({
      description: "A shared loading dock calendar for small warehouses",
      customer: "Building managers at multi-tenant warehouses",
      country: "AU",
    });
    expect(report.dataMode).toBe("SAMPLE");
    expect(report.demand.volume).toBeNull();
    expect(["Build", "Test-first", "Pass"]).toContain(report.verdict);
    expect(report.pains[0].sample).toBe(true);
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.pivots).toHaveLength(3);
  });
});

describe("position map", () => {
  it("names the four quadrants", () => {
    expect(positionLabel(8, 8)).toBe("Breakthrough");
    expect(positionLabel(3, 8)).toBe("Category Leader");
    expect(positionLabel(8, 3)).toBe("Quiet Niche");
    expect(positionLabel(3, 3)).toBe("Crowded Commodity");
  });
});
