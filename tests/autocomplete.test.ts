import { describe, expect, it } from "vitest";
import { classifySuggestion, groupSuggestions } from "../src/lib/autocomplete/cluster";
import { expandSeedQueries, QUERY_EXPANSION_COUNT } from "../src/lib/autocomplete/expand";
import { ideasForCluster } from "../src/lib/autocomplete/ideas";
import { suggestionsFromDataForSeo, suggestionsFromUnofficial } from "../src/lib/autocomplete/fetch";
import { selectSeedsForRun } from "../src/lib/autocomplete/nightly";
import { canAccess, canConsume, quotaFor, remaining } from "../src/lib/gating";

describe("autocomplete query expansion", () => {
  it("appends a-z, 0-9, and the question prefixes", () => {
    const queries = expandSeedQueries("  vet   clinic ");
    expect(queries).toHaveLength(QUERY_EXPANSION_COUNT);
    expect(queries).toHaveLength(40);
    expect(queries[0]).toBe("vet clinic a");
    expect(queries).toContain("vet clinic z");
    expect(queries).toContain("vet clinic 0");
    expect(queries).toContain("vet clinic 9");
    expect(queries).toContain("how vet clinic");
    expect(queries).toContain("why vet clinic");
    expect(queries).toContain("best vet clinic");
    expect(queries).toContain("can vet clinic");
    expect(expandSeedQueries("   ")).toEqual([]);
  });
});

describe("autocomplete clustering", () => {
  it("returns question, problem, and desire clusters with counts", () => {
    const grouped = groupSuggestions("vet clinic", [
      { text: "how to book a vet clinic appointment", query: "how vet clinic" },
      { text: "how to book a vet clinic visit the same day", query: "how vet clinic" },
      { text: "vet clinic no show problem", query: "vet clinic n" },
      { text: "vet clinic no show problem on mondays", query: "vet clinic n" },
      { text: "best vet clinic reminder checklist", query: "best vet clinic" },
      { text: "best vet clinic reminder checklist for deposits", query: "best vet clinic" },
    ]);
    expect(Object.keys(grouped).sort()).toEqual(["desires", "problems", "questions"]);
    for (const cluster of [...grouped.questions, ...grouped.problems, ...grouped.desires]) {
      expect(cluster).toEqual(expect.objectContaining({
        id: expect.any(String),
        kind: expect.stringMatching(/question|problem|desire/),
        label: expect.any(String),
        count: cluster.suggestions.length,
      }));
      expect(cluster.suggestions.length).toBeGreaterThan(0);
    }
    expect(grouped.questions.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(2);
    expect(grouped.problems.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(2);
    expect(grouped.desires.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(2);
    expect(grouped.questions.every((cluster) => cluster.kind === "question")).toBe(true);
  });

  it("classifies a question before a problem word in the same line", () => {
    expect(classifySuggestion("how to fix problems in a shop")).toBe("question");
    const grouped = groupSuggestions("shop", [{ text: "how to fix problems in a shop", query: "how shop" }]);
    expect(grouped.questions).toHaveLength(1);
    expect(grouped.problems).toHaveLength(0);
    expect(grouped.desires).toHaveLength(0);
  });

  it("keeps drafted searches inside the cluster", () => {
    const grouped = groupSuggestions("vet clinic", [
      { text: "best vet clinic reminder checklist", query: "best vet clinic" },
      { text: "best vet clinic reminder checklist for deposits", query: "best vet clinic" },
    ]);
    const cluster = grouped.desires[0];
    const ideas = ideasForCluster("vet clinic", cluster, "checklist", 10);
    expect(ideas).toHaveLength(10);
    const allowed = new Set(cluster.suggestions.map((suggestion) => suggestion.text));
    for (const idea of ideas) {
      expect(idea.ideaType).toBe("DIGITAL");
      expect(idea.searches.length).toBeGreaterThan(0);
      for (const search of idea.searches) expect(allowed.has(search)).toBe(true);
    }
  });
});

describe("autocomplete metering", () => {
  it("gives Builder a small monthly mine quota and Pro a larger one", () => {
    expect(canAccess("FREE", "alphabet")).toBe(false);
    expect(canAccess("BUILDER", "alphabet")).toBe(true);
    expect(canAccess("PRO", "alphabet")).toBe(true);
    expect(quotaFor("FREE", "alphabet")).toBe(0);
    expect(quotaFor("BUILDER", "alphabet")).toBe(5);
    expect(quotaFor("PRO", "alphabet")).toBe(30);
    expect(canConsume("FREE", "alphabet", 0)).toBe(false);
    expect(canConsume("BUILDER", "alphabet", 4)).toBe(true);
    expect(canConsume("BUILDER", "alphabet", 5)).toBe(false);
    expect(remaining("PRO", "alphabet", 29)).toBe(1);
  });
});

describe("autocomplete seed rotation", () => {
  it("runs never-mined niches before the oldest active seed", () => {
    const picked = selectSeedsForRun(
      [
        { niche: "b", country: "US", active: true, lastRunAt: new Date("2026-01-02") },
        { niche: "a", country: "US", active: true, lastRunAt: null },
        { niche: "c", country: "US", active: false, lastRunAt: null },
        { niche: "d", country: "AU", active: true, lastRunAt: new Date("2026-01-01") },
      ],
      2,
    );
    expect(picked.map((seed) => seed.niche)).toEqual(["a", "d"]);
  });
});

describe("autocomplete parsers", () => {
  it("reads DataForSEO suggestion items and the unofficial array", () => {
    const live = suggestionsFromDataForSeo(
      { tasks: [{ status_code: 20000, result: [{ items: [{ suggestion: "vet clinic software", search_query_url: "https://www.google.com/search?q=vet+clinic+software" }] }] }] },
      "vet clinic s",
    );
    expect(live).toEqual([{ text: "vet clinic software", query: "vet clinic s", url: "https://www.google.com/search?q=vet+clinic+software" }]);
    expect(suggestionsFromUnofficial(["vet clinic", ["vet clinic hours", ""]], "vet clinic")).toEqual([
      { text: "vet clinic hours", query: "vet clinic" },
    ]);
  });
});
