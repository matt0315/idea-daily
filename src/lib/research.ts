import type { FounderProfile } from "./founder-fit";
import {
  computeScores,
  researchVerdict,
  scoreLabel,
  verdictConfidence,
  type ScoreInputs,
} from "./scoring";

export type ResearchInput = {
  description: string;
  customer: string;
  country: string;
  url?: string;
};

export type PainQuote = {
  text: string;
  url: string;
  label: string;
  sample: boolean;
};

export type ResearchReport = {
  title: string;
  demand: { summary: string; volume: number | null; growthPct: number | null; sourceIds: number[] };
  competitors: { name: string; url: string; note: string; sample: boolean }[];
  pains: PainQuote[];
  sizing: { topDown: string; bottomUp: string; sourceIds: number[] };
  scores: { opportunity: number; pain: number; buildability: number; timing: number; labels: Record<string, string> };
  verdict: "Build" | "Test-first" | "Pass";
  confidence: number;
  pivots: string[];
  execution: string;
  sources: { id: number; title: string; url: string; note: string; sample: boolean }[];
  dataMode: "SAMPLE" | "LIVE";
};

const PRIOR: ScoreInputs = {
  monthlyVolume: 1000,
  growthPct: 10,
  competitorCount: 5,
  painQuoteCount: 0,
  painSeverityAvg: 3,
  buildWeeks: 4,
  capitalBand: "low",
  regulatoryLoad: 0,
  dependencyRisk: 1,
  timingSignals: 1,
};

export function buildResearchReport(input: ResearchInput, profile?: FounderProfile | null, live?: Partial<ScoreInputs> & { competitors?: ResearchReport["competitors"]; pains?: PainQuote[] }): ResearchReport {
  const hasLiveNumbers = Boolean(live && (live.monthlyVolume != null || (live.pains && live.pains.length > 0)));
  const inputs: ScoreInputs = { ...PRIOR, ...stripUndefined(live) };
  if (!hasLiveNumbers) {
    inputs.painQuoteCount = 0;
    inputs.monthlyVolume = PRIOR.monthlyVolume;
  }
  const scores = computeScores(inputs);
  const verdict = researchVerdict(scores);
  const confidence = verdictConfidence(scores);
  const title = input.description.trim().slice(0, 80) || "Untitled idea";
  const country = input.country || "US";

  const sources = [
    {
      id: 1,
      title: hasLiveNumbers ? "Keyword provider" : "Neutral prior used for unscored inputs",
      url: "/methodology#research",
      note: hasLiveNumbers
        ? "Figures in this report come from the attached provider response."
        : "No keyword provider was configured. Volume is a labelled prior of 1,000, not a measurement.",
      sample: !hasLiveNumbers,
    },
    {
      id: 2,
      title: "Founder inputs",
      url: input.url || "/methodology#research",
      note: `Description and customer were submitted by the user. Country: ${country}.`,
      sample: false,
    },
  ];

  const pains: PainQuote[] = live?.pains?.length
    ? live.pains
    : [
        {
          text: "Illustrative composite, not a real customer sentence: operators describe this chore as something they finish after hours because no tool fits the exact handoff.",
          url: "/methodology#quotes",
          label: "Illustrative composite",
          sample: true,
        },
      ];

  const competitors = live?.competitors?.length
    ? live.competitors
    : [
        {
          name: "Not named",
          url: "/methodology#competitors",
          note: "Sample mode does not invent competitor lists. Connect a search API to fill this from result URLs.",
          sample: true,
        },
      ];

  const hours = profile?.weeklyHours;
  const pivots = [
    `Sell the artifact as a done-for-you service to ${input.customer || "the stated customer"} before writing software.`,
    "Narrow the buyer to one trade or one city and repeat the same workflow twenty times.",
    "Keep the workflow and change the payer — the person who feels the pain may not own the budget.",
  ];

  return {
    title,
    demand: {
      summary: hasLiveNumbers
        ? `Measured demand inputs were supplied for ${country}.`
        : `Demand was not measured for ${country}. The score uses a neutral prior so the page can render. Do not quote the volume outside this app.`,
      volume: hasLiveNumbers ? inputs.monthlyVolume : null,
      growthPct: hasLiveNumbers ? inputs.growthPct : null,
      sourceIds: [1],
    },
    competitors,
    pains,
    sizing: {
      topDown: "No market-size report is cited. Top-down sizing stays blank until a primary source is linked.",
      bottomUp: hours
        ? `Bottom-up sketch, labelled as arithmetic not a forecast: if ${input.customer || "the customer"} pays a price you have not set yet, and you can serve them in ${hours} hours a week, write the price down only after the first five invoices. {{s1}}`
        : "Bottom-up sketch: price × accounts you can support. Both numbers are blank until interviews. {{s1}}",
      sourceIds: [1, 2],
    },
    scores: {
      opportunity: scores.opportunity,
      pain: scores.pain,
      buildability: scores.buildability,
      timing: scores.timing,
      labels: {
        opportunity: scoreLabel("opportunity", scores.opportunity),
        pain: scoreLabel("pain", scores.pain),
        buildability: scoreLabel("buildability", scores.buildability),
        timing: scoreLabel("timing", scores.timing),
      },
    },
    verdict,
    confidence,
    pivots,
    execution: "Interview five people who match the customer line. Ask what they did the last time this chore showed up, what it cost them, and what they already pay. Only then replace the prior scores.",
    sources,
    dataMode: hasLiveNumbers ? "LIVE" : "SAMPLE",
  };
}

function stripUndefined(live?: Partial<ScoreInputs>): Partial<ScoreInputs> {
  if (!live) return {};
  const next: Partial<ScoreInputs> = {};
  (Object.keys(live) as (keyof ScoreInputs)[]).forEach((key) => {
    const value = live[key];
    if (value !== undefined && key in PRIOR) {
      // @ts-expect-error indexed assignment across the known keys
      next[key] = value;
    }
  });
  return next;
}
