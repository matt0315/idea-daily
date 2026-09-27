import { describe, expect, it } from "vitest";
import {
  computeScores,
  executionDifficulty,
  growthComponent,
  researchVerdict,
  roastVerdict,
  scoreLabel,
  volumeComponent,
} from "../src/lib/scoring";

const base = {
  monthlyVolume: 8000,
  growthPct: 40,
  competitorCount: 3,
  painQuoteCount: 6,
  painSeverityAvg: 4,
  buildWeeks: 3,
  capitalBand: "low" as const,
  regulatoryLoad: 0,
  dependencyRisk: 1,
  timingSignals: 3,
};

describe("computeScores", () => {
  it("stays inside 1–10 and is deterministic", () => {
    const a = computeScores(base);
    const b = computeScores(base);
    expect(a).toEqual(b);
    for (const key of ["opportunity", "pain", "buildability", "timing"] as const) {
      expect(a[key]).toBeGreaterThanOrEqual(1);
      expect(a[key]).toBeLessThanOrEqual(10);
    }
  });

  it("raises opportunity when volume and growth rise", () => {
    const low = computeScores({ ...base, monthlyVolume: 100, growthPct: 0 });
    const high = computeScores({ ...base, monthlyVolume: 80000, growthPct: 180 });
    expect(high.opportunity).toBeGreaterThan(low.opportunity);
  });

  it("lowers the gap component as competitors pile up", () => {
    const open = computeScores({ ...base, competitorCount: 0 });
    const crowded = computeScores({ ...base, competitorCount: 12 });
    expect(open.breakdown.gap).toBeGreaterThan(crowded.breakdown.gap);
    expect(open.opportunity).toBeGreaterThan(crowded.opportunity);
  });

  it("lowers buildability for long, expensive, regulated work", () => {
    const light = computeScores(base);
    const heavy = computeScores({
      ...base,
      buildWeeks: 20,
      capitalBand: "high",
      regulatoryLoad: 3,
      dependencyRisk: 3,
    });
    expect(heavy.buildability).toBeLessThan(light.buildability);
    expect(executionDifficulty(heavy.buildability)).toBeGreaterThan(executionDifficulty(light.buildability));
  });

  it("does not treat zero volume as a healthy market", () => {
    expect(volumeComponent(0)).toBe(1);
    expect(growthComponent(-30)).toBeLessThanOrEqual(3);
  });

  it("labels the four scores with our own words", () => {
    expect(scoreLabel("opportunity", 8)).toBe("Strong");
    expect(scoreLabel("pain", 9)).toBe("Severe");
    expect(scoreLabel("buildability", 10)).toBe("Weekend-scale");
    expect(scoreLabel("timing", 2)).toBe("Stale window");
  });
});

describe("verdicts", () => {
  it("builds only when opportunity, pain, and buildability clear the bar", () => {
    expect(researchVerdict({ opportunity: 8, pain: 8, buildability: 7 })).toBe("Build");
    expect(roastVerdict({ opportunity: 8, pain: 8, buildability: 7 })).toBe("Build");
  });

  it("sends middling ideas to a test, and weak ideas to a pass or skip", () => {
    expect(researchVerdict({ opportunity: 6, pain: 6, buildability: 4 })).toBe("Test-first");
    expect(roastVerdict({ opportunity: 6, pain: 6, buildability: 4 })).toBe("Pivot");
    expect(researchVerdict({ opportunity: 3, pain: 4, buildability: 8 })).toBe("Pass");
    expect(roastVerdict({ opportunity: 3, pain: 8, buildability: 8 })).toBe("Skip");
  });
});
