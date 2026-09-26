import { describe, expect, it } from "vitest";
import { founderArchetype, founderFit, type FounderProfile, type IdeaRequirements } from "../src/lib/founder-fit";

const profile: FounderProfile = {
  skills: { tech: 4, sales: 2, design: 2, domain: 3 },
  weeklyHours: 20,
  capitalBand: "low",
  riskTolerance: "medium",
  model: "b2b",
  motion: "saas",
  industries: ["trades"],
  location: "AU",
};

const matching: IdeaRequirements = {
  skills: { tech: 3, sales: 2, design: 2, domain: 2 },
  weeklyHours: 15,
  capitalBand: "low",
  risk: "low",
  model: "b2b",
  motion: "saas",
  industries: ["trades"],
  mvpWeeks: 3,
  salesIntensity: 3,
  regulatoryLoad: 0,
};

describe("founder fit", () => {
  it("scores a matching profile higher than a conflicting one", () => {
    const good = founderFit(profile, matching);
    const poor = founderFit(profile, {
      ...matching,
      skills: { tech: 1, sales: 5, design: 5, domain: 5 },
      weeklyHours: 40,
      capitalBand: "high",
      model: "b2c",
      motion: "service",
      industries: ["hardware"],
      regulatoryLoad: 3,
    });
    expect(good.percent).toBeGreaterThan(poor.percent);
    expect(good.percent).toBeGreaterThanOrEqual(80);
    expect(poor.reasons.some((reason) => reason.impact === "hurts")).toBe(true);
    expect(poor.changes.length).toBeGreaterThan(0);
  });

  it("names an archetype from the profile without a model call", () => {
    expect(founderArchetype(profile)).toBe("Systems Builder");
    expect(
      founderArchetype({
        ...profile,
        skills: { tech: 1, sales: 5, design: 1, domain: 1 },
        motion: "service",
      }),
    ).toBe("Distribution First");
  });
});
