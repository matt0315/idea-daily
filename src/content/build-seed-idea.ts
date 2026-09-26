import type { IdeaTypeCode } from "../lib/autocomplete/copy";
import type { SearchEvidence } from "../lib/autocomplete/evidence";
import type { BuildBrief } from "../lib/build-guides";
import type { IdeaRequirements } from "../lib/founder-fit";
import { positionLabel } from "../lib/frameworks";
import { computeScores, executionDifficulty, scoreLabel, type CapitalBand, type ScoreInputs } from "../lib/scoring";
import { growthFromMonthlySeries } from "../lib/trends";

export type SeedSource = {
  id: number;
  title: string;
  url: string;
  publisher: string;
  accessed: string;
  note: string;
  sample: boolean;
};

export type SeedChannel = {
  platform: string;
  name: string;
  url: string;
  note: string;
  sample: boolean;
};

export type SeedIdeaInput = {
  slug: string;
  title: string;
  summary: string;
  daysAgo: number;
  status?: "PUBLISHED" | "QUEUED";
  tags: string[];
  pitch: string;
  keyword: string;
  volume: number;
  growthPct: number;
  country?: string;
  inputs: ScoreInputs;
  category: string;
  market: "B2B" | "B2C" | "BOTH";
  capitalBand: CapitalBand;
  revenueSymbols: string;
  arrLabel: string;
  arrNote: string;
  gtm: number;
  gtmNote: string;
  target: string;
  competitor: string;
  channels: SeedChannel[];
  offerLadder: { tier: string; price: string; detail: string }[];
  whyNow: string;
  proof: string;
  marketGap: string;
  executionPlan: string;
  uniqueness: number;
  value: number;
  triangle: { audience: number; community: number; offer: number };
  frameworkNote: string;
  requirements: IdeaRequirements;
  sources: SeedSource[];
  brief: BuildBrief;
  ideaType?: IdeaTypeCode;
  searchEvidence?: SearchEvidence | null;
};

const CLOCK = new Date("2026-09-26T06:00:00.000Z");

function monthLabel(indexFromEnd: number): string {
  const date = new Date(Date.UTC(2026, 8, 1));
  date.setUTCMonth(date.getUTCMonth() - (17 - indexFromEnd));
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

/** Builds an 18-month sample series whose stated growth matches the last-3 vs year-ago-3 definition. */
export function seriesFor(volume: number, growthPct: number): { month: string; volume: number }[] {
  const recent = Math.max(1, volume);
  const prior = Math.max(1, Math.round(recent / (1 + growthPct / 100)));
  return Array.from({ length: 18 }, (_, index) => {
    const t = index / 17;
    const value = Math.round(prior + (recent - prior) * t);
    return { month: monthLabel(index), volume: value };
  });
}

export function buildSeedIdea(input: SeedIdeaInput) {
  const scores = computeScores(input.inputs);
  const series = seriesFor(input.volume, input.growthPct);
  const computedGrowth = growthFromMonthlySeries(series.map((point) => point.volume));
  const growth = computedGrowth ?? input.growthPct;
  const status = input.status ?? "PUBLISHED";
  const publishedAt = status === "PUBLISHED" ? new Date(CLOCK.getTime() - input.daysAgo * 24 * 60 * 60 * 1000) : null;
  const difficulty = executionDifficulty(scores.buildability);

  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    status,
    publishedAt,
    dataMode: "SAMPLE" as const,
    tags: input.tags,
    pitch: input.pitch,
    keyword: input.keyword,
    keywordVolume: series[series.length - 1].volume,
    keywordGrowth: growth,
    keywordCountry: input.country ?? "US",
    keywordSeries: series,
    keywordAsOf: "sample-series",
    keywordSource:
      "Sample series shaped so the chart and the growth figure use the same definition (last 3 months versus the same 3 months a year earlier). Not a live keyword measurement.",
    scores: {
      opportunity: {
        value: scores.opportunity,
        label: scoreLabel("opportunity", scores.opportunity),
        why: "40% search-volume component, 35% growth, 25% competitor gap. Inputs are sample priors stored on the idea.",
        sourceIds: [1],
      },
      pain: {
        value: scores.pain,
        label: scoreLabel("pain", scores.pain),
        why: "60% sourced-quote count, 40% average severity. Sample ideas with no verbatim quotes keep a modest quote count.",
        sourceIds: [1],
      },
      buildability: {
        value: scores.buildability,
        label: scoreLabel("buildability", scores.buildability),
        why: "Starts at 10 and subtracts weeks, capital, regulatory load, and platform dependency.",
        sourceIds: [1],
      },
      timing: {
        value: scores.timing,
        label: scoreLabel("timing", scores.timing),
        why: "55% growth component, 45% count of independent timing signals.",
        sourceIds: [1],
      },
      inputs: input.inputs,
    },
    businessFit: {
      revenueSymbols: input.revenueSymbols,
      arrLabel: input.arrLabel,
      arrNote: input.arrNote,
      difficulty,
      difficultyNote: `Derived from buildability ${scores.buildability}/10. 1 is the lightest build and 10 is the heaviest.`,
      gtm: input.gtm,
      gtmNote: input.gtmNote,
      category: input.category,
      market: input.market,
      target: input.target,
      competitor: input.competitor,
      trendLine: "Sample trend line. The number is not from a keyword provider.",
    },
    community: { channels: input.channels },
    offerLadder: input.offerLadder,
    whyNow: input.whyNow,
    proof: input.proof,
    marketGap: input.marketGap,
    executionPlan: input.executionPlan,
    frameworks: {
      uniqueness: input.uniqueness,
      value: input.value,
      position: positionLabel(input.uniqueness, input.value),
      signalTriangle: input.triangle,
      note: input.frameworkNote,
    },
    requirements: input.requirements,
    sources: input.sources,
    buildBrief: input.brief,
    category: input.category,
    market: input.market,
    ideaType: input.ideaType ?? "SAAS",
    searchEvidence: input.searchEvidence ?? null,
    difficulty,
    capitalBand: input.capitalBand,
    opportunity: scores.opportunity,
    pain: scores.pain,
    buildability: scores.buildability,
    timing: scores.timing,
    growth,
  };
}
