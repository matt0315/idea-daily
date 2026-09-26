import { positionLabel } from "../frameworks";
import {
  computeScores,
  executionDifficulty,
  scoreLabel,
  type CapitalBand,
  type ScoreInputs,
} from "../scoring";
import type { Candidate } from "./cluster";

export type IdeaSource = {
  id: number;
  title: string;
  url: string;
  publisher: string;
  accessed: string;
  note: string;
  sample: boolean;
};

export type BuiltIdea = {
  slug: string;
  title: string;
  summary: string;
  dataMode: "SAMPLE" | "LIVE";
  tags: string[];
  pitch: string;
  keyword: string;
  keywordVolume: number;
  keywordGrowth: number;
  keywordCountry: string;
  keywordSeries: { month: string; volume: number }[];
  keywordAsOf: string;
  keywordSource: string;
  scores: Record<string, unknown>;
  businessFit: Record<string, unknown>;
  community: Record<string, unknown>;
  offerLadder: { tier: string; price: string; detail: string }[];
  whyNow: string;
  proof: string;
  marketGap: string;
  executionPlan: string;
  frameworks: Record<string, unknown>;
  requirements: Record<string, unknown>;
  sources: IdeaSource[];
  buildBrief: Record<string, unknown>;
  category: string;
  market: "B2B" | "B2C" | "BOTH";
  difficulty: number;
  capitalBand: CapitalBand;
  opportunity: number;
  pain: number;
  buildability: number;
  timing: number;
  growth: number;
  status: "QUEUED";
};

const NEUTRAL_VOLUME = 1000;

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "idea";
}

function series(volume: number): { month: string; volume: number }[] {
  const months = ["2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09"];
  return months.map((month, index) => ({
    month,
    volume: Math.round(volume * (0.72 + index * 0.03)),
  }));
}

/**
 * Fills the fixed idea template from a candidate.
 * Numbers are a neutral prior, never a measured search volume, and the record is marked SAMPLE
 * unless every input signal was live AND the caller passes measured volume.
 */
export function fillIdeaTemplate(
  candidate: Candidate,
  options?: { measuredVolume?: number; measuredGrowth?: number; country?: string },
): BuiltIdea {
  const measured = options?.measuredVolume != null && !candidate.sample;
  const volume = measured ? options!.measuredVolume! : NEUTRAL_VOLUME;
  const growth = measured && options?.measuredGrowth != null ? options.measuredGrowth : 12;
  const inputs: ScoreInputs = {
    monthlyVolume: volume,
    growthPct: growth,
    competitorCount: 4,
    painQuoteCount: candidate.sample ? 0 : Math.min(6, candidate.signals.length),
    painSeverityAvg: 3,
    buildWeeks: 3,
    capitalBand: "low",
    regulatoryLoad: 0,
    dependencyRisk: 1,
    timingSignals: Math.min(4, candidate.signals.length),
  };
  const scores = computeScores(inputs);
  const difficulty = executionDifficulty(scores.buildability);
  const dataMode = measured ? "LIVE" : "SAMPLE";
  const keyword = candidate.keyword;
  const title = candidate.title;
  const sourceNote = candidate.sample
    ? "Sample signal used because a live source was unavailable. This is not a measured market."
    : "Signal URLs were fetched. Volume is live only when a keyword provider returned it.";

  const sources: IdeaSource[] = [
    {
      id: 1,
      title: measured ? "Keyword provider result" : "Neutral volume prior (1,000)",
      url: "/methodology#volume",
      publisher: "IdeaDaily",
      accessed: new Date().toISOString().slice(0, 10),
      note: sourceNote,
      sample: !measured,
    },
    ...candidate.signals.slice(0, 4).map((signal, index) => ({
      id: index + 2,
      title: signal.title,
      url: signal.url,
      publisher: signal.source,
      accessed: signal.capturedAt.slice(0, 10),
      note: signal.sample ? "Sample signal. Not a live post." : "Fetched signal.",
      sample: signal.sample,
    })),
  ];

  const uniqueness = 6;
  const value = 7;

  return {
    slug: `${slugify(title)}-${Date.now().toString(36).slice(-4)}`,
    title,
    summary: `A narrow tool around “${keyword}”, drafted from ${candidate.signals.length} clustered signal${candidate.signals.length === 1 ? "" : "s"}.`,
    dataMode,
    tags: dataMode === "SAMPLE" ? ["Needs review", "Sample inputs", "Narrow workflow"] : ["Needs review", "Live signals"],
    pitch: [
      `People are already describing this job in public: ${candidate.signals[0]?.title ?? title}.`,
      `${title} would turn that repeating chore into a single workflow for one buyer, instead of a horizontal suite.`,
      `The first version is a manual-backed page: collect the inputs, produce one artifact the buyer can send, and take a deposit. Do not build a marketplace.`,
      `Revenue math is not stated here. Add a price only after five buyers say what they pay today. {{s1}}`,
    ].join("\n\n"),
    keyword,
    keywordVolume: volume,
    keywordGrowth: growth,
    keywordCountry: options?.country ?? "US",
    keywordSeries: series(volume),
    keywordAsOf: measured ? new Date().toISOString().slice(0, 10) : "unmeasured",
    keywordSource: measured
      ? "DataForSEO Google Ads volume. Growth is last 3 months versus the same 3 months a year earlier."
      : "Sample prior of 1,000 monthly searches and +12% growth. Not a live measurement.",
    scores: {
      opportunity: { value: scores.opportunity, label: scoreLabel("opportunity", scores.opportunity), why: "Volume, growth, and competitor gap, weighted 40/35/25.", sourceIds: [1] },
      pain: { value: scores.pain, label: scoreLabel("pain", scores.pain), why: candidate.sample ? "No sourced pain quotes yet, so the pain score stays modest." : "Quote count comes from attached signals.", sourceIds: [1] },
      buildability: { value: scores.buildability, label: scoreLabel("buildability", scores.buildability), why: "Assumes a 3-week MVP, low capital, and one platform dependency.", sourceIds: [1] },
      timing: { value: scores.timing, label: scoreLabel("timing", scores.timing), why: "Timing uses the growth component plus the count of independent signals.", sourceIds: [1] },
      inputs,
    },
    businessFit: {
      revenueSymbols: "$$",
      arrLabel: "Unset until priced",
      arrNote: "No ARR band is printed from sample inputs.",
      difficulty,
      difficultyNote: "Template assumption: a solo founder can ship a concierge version in about three weeks.",
      gtm: 5,
      gtmNote: "Go-to-market is untested. Start with the communities linked on the sources list.",
      category: "Vertical workflow",
      market: "B2B",
      target: `Buyers searching around “${keyword}”.`,
      competitor: "Not researched in the template pass. Run Idea Agent before naming a competitor.",
      trendLine: dataMode === "SAMPLE" ? "Trend line is a flat prior, not search data." : "Trend line uses the measured series.",
    },
    community: {
      channels: candidate.signals.slice(0, 4).map((signal) => ({
        platform: signal.source,
        name: signal.title,
        url: signal.url,
        note: signal.sample ? "Sample pointer. No member count is claimed." : "Live signal URL.",
        sample: signal.sample,
      })),
    },
    offerLadder: [
      { tier: "Lead magnet", price: "Free", detail: "A one-page checklist of the workflow this idea replaces." },
      { tier: "Frontend", price: "Set after interviews", detail: "Done-for-you version of the artifact, delivered by hand." },
      { tier: "Core", price: "Set after interviews", detail: "Software seat once five buyers have paid for the manual version." },
    ],
    whyNow: `This candidate reached the queue because ${candidate.signals.length} signals clustered on the same chore. That is a reason to review it, not a reason to build it. {{s1}}`,
    proof: candidate.sample
      ? "No customer sentences are attached. Sample mode does not invent quotes. Approve this only after a person reads the linked communities."
      : "Read the linked signals before treating any sentence as a customer quote. The template does not paraphrase them into fake quotations.",
    marketGap: `Incumbents that cover “${keyword}” were not fetched in this pass. Leave this paragraph until Idea Agent or a manual search names them with links.`,
    executionPlan: "Day 1: write the price and the exclusions with one buyer on a call. Day 2–4: deliver the artifact by hand five times. Day 5–7: turn only the repeated steps into software.",
    frameworks: {
      uniqueness,
      value,
      position: positionLabel(uniqueness, value),
      signalTriangle: { audience: 5, community: Math.min(9, 3 + candidate.signals.length), offer: 5 },
      note: "Position Map and Signal Triangle scores are starter marks for the reviewer, not research findings.",
    },
    requirements: {
      skills: { tech: 3, sales: 3, design: 2, domain: 2 },
      weeklyHours: 15,
      capitalBand: "low",
      risk: "low",
      model: "b2b",
      motion: "saas",
      industries: [],
      mvpWeeks: 3,
      salesIntensity: 3,
      regulatoryLoad: 0,
    },
    sources,
    buildBrief: {
      title,
      slug: slugify(title),
      oneLiner: `Software that finishes the “${keyword}” chore for one specific buyer.`,
      customer: `Operators who currently handle “${keyword}” by hand.`,
      problem: candidate.signals[0]?.title ?? title,
      mvp: ["Capture the inputs", "Produce one sendable artifact", "Take a deposit"],
      stack: "Next.js, Postgres, Stripe",
      pricing: "Do not invent a price. Use the manual offer until interviews set it.",
      outOfScope: ["Marketplace", "Native mobile apps", "Multi-language"],
    },
    category: "Vertical workflow",
    market: "B2B",
    difficulty,
    capitalBand: "low",
    opportunity: scores.opportunity,
    pain: scores.pain,
    buildability: scores.buildability,
    timing: scores.timing,
    growth,
    status: "QUEUED",
  };
}
