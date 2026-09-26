import { Prisma, type PrismaClient } from "@prisma/client";
import { positionLabel } from "../frameworks";
import type { BuiltIdea } from "../pipeline/write";
import { computeScores, executionDifficulty, scoreLabel, type CapitalBand, type ScoreInputs } from "../scoring";
import type { SuggestionCluster } from "./cluster";
import { ideaTypeLabel } from "./copy";
import { evidenceForCluster, type SearchEvidence } from "./evidence";
import { productById, type MinedDraft } from "./ideas";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "idea";
}

function series(volume: number): { month: string; volume: number }[] {
  const months = ["2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09"];
  return months.map((month, index) => ({ month, volume: Math.round(volume * (0.72 + index * 0.03)) }));
}

export function builtIdeaFromMine(input: {
  draft: MinedDraft;
  cluster: SuggestionCluster;
  niche: string;
  country: string;
  language: string;
  source: string;
  dataMode: "SAMPLE" | "LIVE";
  note: string;
}): BuiltIdea {
  const product = productById(input.draft.productType);
  const measured = input.cluster.volume != null && input.dataMode === "LIVE" && input.source === "dataforseo";
  const volume = measured ? input.cluster.volume! : 1000;
  const inputs: ScoreInputs = {
    monthlyVolume: volume,
    growthPct: 12,
    competitorCount: 4,
    painQuoteCount: 0,
    painSeverityAvg: input.cluster.kind === "problem" ? 3 : 2,
    buildWeeks: product.buildWeeks,
    capitalBand: product.capitalBand as CapitalBand,
    regulatoryLoad: 0,
    dependencyRisk: 1,
    timingSignals: Math.min(4, input.cluster.count),
  };
  const scores = computeScores(inputs);
  const difficulty = executionDifficulty(scores.buildability);
  const evidence: SearchEvidence = evidenceForCluster({
    niche: input.niche,
    country: input.country,
    language: input.language,
    source: input.source,
    dataMode: input.dataMode,
    note: input.note,
    cluster: input.cluster,
  });
  const dataMode = measured ? "LIVE" : "SAMPLE";
  const searches = input.draft.searches.map((search) => `“${search}”`).join(", ");
  const sources = [
    {
      id: 1,
      title: measured ? "DataForSEO Google Ads volume" : "Neutral volume prior (1,000)",
      url: "/methodology",
      publisher: "IdeaDaily",
      accessed: new Date().toISOString().slice(0, 10),
      note: measured
        ? "Monthly volume is the cluster’s measured figure. Growth of +12% and the chart shape are priors, not a year-ago history."
        : "Volume and growth are sample priors. Autocomplete lines are stored separately and are not a volume measurement.",
      sample: !measured,
    },
    {
      id: 2,
      title: input.source === "dataforseo" ? "DataForSEO Google Autocomplete" : "Autocomplete phrases on this record",
      url: input.source === "dataforseo" ? "https://docs.dataforseo.com/v3/serp/google/autocomplete/live/advanced/" : "/methodology",
      publisher: input.source === "dataforseo" ? "DataForSEO" : "IdeaDaily",
      accessed: new Date().toISOString().slice(0, 10),
      note: input.note,
      sample: input.dataMode === "SAMPLE",
    },
  ];
  const typeLabel = ideaTypeLabel(input.draft.ideaType);
  const uniqueness = input.draft.ideaType === "DIGITAL" ? 5 : 6;
  const value = 6;

  return {
    slug: `${slugify(input.draft.title)}-${slugify(input.niche)}-${Date.now().toString(36).slice(-4)}`,
    title: input.draft.title,
    summary: input.draft.summary,
    dataMode,
    tags: dataMode === "SAMPLE" ? ["Needs review", typeLabel, "Sample inputs"] : ["Needs review", typeLabel, "Live suggestions"],
    pitch: [
      `${input.draft.title} is a ${product.label.toLowerCase()} for “${input.niche}”.`,
      `It is tied to these searches: ${searches}.`,
      input.dataMode === "SAMPLE"
        ? "Those phrases are sample stand-ins. They are not live autocomplete results, and they are not customer quotes."
        : "Those phrases are autocomplete suggestions. They show how a search starts. They are not customer quotes and they are not proof of payment.",
      "Ship the manual version first: one artifact the buyer can use this week. Do not print a price until someone pays. {{s1}}",
    ].join("\n\n"),
    keyword: input.cluster.label.slice(0, 80) || input.niche,
    keywordVolume: volume,
    keywordGrowth: 12,
    keywordCountry: input.country,
    keywordSeries: series(volume),
    keywordAsOf: measured ? new Date().toISOString().slice(0, 10) : "unmeasured",
    keywordSource: measured
      ? "DataForSEO Google Ads monthly volume for the cluster label. The +12% growth figure and the chart shape are priors, not a measured history."
      : "Sample prior of 1,000 monthly searches and +12% growth. Not a live measurement.",
    scores: {
      opportunity: { value: scores.opportunity, label: scoreLabel("opportunity", scores.opportunity), why: "Volume, growth, and competitor gap, weighted 40/35/25. Pain quotes are zero because searches are not quotes.", sourceIds: [1] },
      pain: { value: scores.pain, label: scoreLabel("pain", scores.pain), why: "No sourced customer quotes are attached, so the pain score stays modest.", sourceIds: [1] },
      buildability: { value: scores.buildability, label: scoreLabel("buildability", scores.buildability), why: `${product.label} assumes about ${product.buildWeeks} week(s) and ${product.capitalBand} capital.`, sourceIds: [1] },
      timing: { value: scores.timing, label: scoreLabel("timing", scores.timing), why: "Timing uses the growth prior plus the number of phrases in the cluster.", sourceIds: [1, 2] },
      inputs,
    },
    businessFit: {
      revenueSymbols: input.draft.ideaType === "DIGITAL" ? "$" : "$$",
      arrLabel: "Unset until priced",
      arrNote: "No revenue figure is printed from autocomplete phrases.",
      difficulty,
      difficultyNote: "Derived from buildability. A manual version comes before software.",
      gtm: 4,
      gtmNote: "Go-to-market is untested. Start from the searches on this page and talk to people who typed them.",
      category: typeLabel,
      market: "BOTH",
      target: `People searching around “${input.niche}”.`,
      competitor: "Not named in the mining pass. Open the phrases before you name a substitute.",
      trendLine: measured ? "Volume is measured. The chart shape is still a prior." : "Trend line is a flat prior, not search data.",
    },
    community: { channels: [] },
    offerLadder: [
      { tier: "Lead magnet", price: "Free", detail: `A one-page version of the ${product.label.toLowerCase()} that answers the first search on this cluster.` },
      { tier: "Frontend", price: "Set after interviews", detail: "You deliver the artifact by hand for the first buyers." },
      { tier: "Core", price: "Set after interviews", detail: input.draft.ideaType === "DIGITAL" ? "The packaged file, once the manual version has been paid for." : "A software seat once the manual offer has been paid for." },
    ],
    whyNow: `This draft reached the queue because ${input.cluster.count} similar searches clustered under “${input.cluster.label}”. That is a reason to read them, not a reason to build. {{s2}}`,
    proof: "No customer sentences are attached. Autocomplete phrases are searches, not quotes. Approve this only after a person talks to buyers. {{s1}}",
    marketGap: `Substitutes for “${input.niche}” were not fetched in the mining pass. Leave this paragraph until a search names them with links.`,
    executionPlan: "Day 1: read the searches and write the exclusions with one buyer. Days 2–4: deliver the artifact by hand. Days 5–7: productize only the steps you repeated.",
    frameworks: {
      uniqueness,
      value,
      position: positionLabel(uniqueness, value),
      signalTriangle: { audience: 4, community: Math.min(8, 2 + input.cluster.count), offer: input.draft.ideaType === "DIGITAL" ? 6 : 5 },
      note: "Position Map and Signal Triangle marks are starter scores for the reviewer, not research findings.",
    },
    requirements: {
      skills: { tech: input.draft.ideaType === "SAAS" ? 3 : 2, sales: 3, design: 2, domain: 3 },
      weeklyHours: input.draft.ideaType === "DIGITAL" ? 8 : 15,
      capitalBand: product.capitalBand,
      risk: "low",
      model: "both",
      motion: input.draft.ideaType === "SAAS" || input.draft.ideaType === "APP" ? "saas" : "either",
      industries: [],
      mvpWeeks: product.buildWeeks,
      salesIntensity: 3,
      regulatoryLoad: 0,
    },
    sources,
    buildBrief: {
      title: input.draft.title,
      slug: slugify(input.draft.title),
      oneLiner: input.draft.summary.slice(0, 180),
      customer: `People searching “${input.niche}”.`,
      problem: input.draft.searches[0] || input.cluster.label,
      mvp: ["One artifact", "The searches it answers", "A way to take payment"],
      stack: input.draft.ideaType === "DIGITAL" ? "A document or spreadsheet" : "Next.js, Postgres, Stripe",
      pricing: "Do not invent a price. Use the manual offer until interviews set it.",
      outOfScope: ["A marketplace", "Invented testimonials", "A second niche"],
    },
    category: typeLabel,
    market: "BOTH",
    ideaType: input.draft.ideaType,
    searchEvidence: evidence,
    difficulty,
    capitalBand: product.capitalBand as CapitalBand,
    opportunity: scores.opportunity,
    pain: scores.pain,
    buildability: scores.buildability,
    timing: scores.timing,
    growth: 12,
    status: "QUEUED",
  };
}

export function queuedIdeaData(idea: BuiltIdea): Prisma.IdeaCreateInput {
  return {
    slug: idea.slug,
    title: idea.title,
    summary: idea.summary,
    status: "QUEUED",
    dataMode: idea.dataMode,
    tags: idea.tags as Prisma.InputJsonValue,
    pitch: idea.pitch,
    keyword: idea.keyword,
    keywordVolume: idea.keywordVolume,
    keywordGrowth: idea.keywordGrowth,
    keywordCountry: idea.keywordCountry,
    keywordSeries: idea.keywordSeries as Prisma.InputJsonValue,
    keywordAsOf: idea.keywordAsOf,
    keywordSource: idea.keywordSource,
    scores: idea.scores as Prisma.InputJsonValue,
    businessFit: idea.businessFit as Prisma.InputJsonValue,
    community: idea.community as Prisma.InputJsonValue,
    offerLadder: idea.offerLadder as Prisma.InputJsonValue,
    whyNow: idea.whyNow,
    proof: idea.proof,
    marketGap: idea.marketGap,
    executionPlan: idea.executionPlan,
    frameworks: idea.frameworks as Prisma.InputJsonValue,
    requirements: idea.requirements as Prisma.InputJsonValue,
    sources: idea.sources as Prisma.InputJsonValue,
    buildBrief: idea.buildBrief as Prisma.InputJsonValue,
    category: idea.category,
    market: idea.market,
    ideaType: idea.ideaType,
    searchEvidence: idea.searchEvidence ? (idea.searchEvidence as Prisma.InputJsonValue) : Prisma.JsonNull,
    difficulty: idea.difficulty,
    capitalBand: idea.capitalBand,
    opportunity: idea.opportunity,
    pain: idea.pain,
    buildability: idea.buildability,
    timing: idea.timing,
    growth: idea.growth,
  };
}

export async function insertQueuedIdea(db: PrismaClient, idea: BuiltIdea, options?: { skipSameTitle?: boolean }): Promise<boolean> {
  const existingSlug = await db.idea.findUnique({ where: { slug: idea.slug } });
  if (existingSlug) return false;
  if (options?.skipSameTitle) {
    const existingTitle = await db.idea.findFirst({
      where: { title: idea.title, status: { in: ["QUEUED", "APPROVED", "CANDIDATE", "PUBLISHED"] } },
    });
    if (existingTitle) return false;
  }
  await db.idea.create({ data: queuedIdeaData(idea) });
  return true;
}
