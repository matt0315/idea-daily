import type { Idea } from "@prisma/client";
import { isSearchEvidence, type SearchEvidence } from "./autocomplete/evidence";
import type { IdeaTypeCode } from "./autocomplete/copy";
import type { IdeaRequirements } from "./founder-fit";
import { checklistFromIdeaFields, readFocusChecklist, type FocusChecklist } from "./focus";

export type Facet = { value: number; label: string; why: string; sourceIds: number[] };
export type IdeaSource = {
  id: number;
  title: string;
  url: string;
  publisher: string;
  accessed: string;
  note: string;
  sample: boolean;
};
export type Channel = { platform: string; name: string; url: string; note: string; sample: boolean };
export type OfferTier = { tier: string; price: string; detail: string };

export type IdeaView = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  publishedAt: Date | null;
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
  scores: { opportunity: Facet; pain: Facet; buildability: Facet; timing: Facet };
  businessFit: {
    revenueSymbols: string;
    arrLabel: string;
    arrNote: string;
    difficulty: number;
    difficultyNote: string;
    gtm: number;
    gtmNote: string;
    category: string;
    market: string;
    target: string;
    competitor: string;
    trendLine: string;
  };
  channels: Channel[];
  offerLadder: OfferTier[];
  whyNow: string;
  proof: string;
  marketGap: string;
  executionPlan: string;
  frameworks: {
    uniqueness: number;
    value: number;
    position: string;
    signalTriangle: { audience: number; community: number; offer: number };
    note: string;
  };
  requirements: IdeaRequirements;
  sources: IdeaSource[];
  category: string;
  market: string;
  ideaType: IdeaTypeCode;
  searchEvidence: SearchEvidence | null;
  difficulty: number;
  capitalBand: string;
  opportunity: number;
  pain: number;
  buildability: number;
  timing: number;
  growth: number;
  buildBrief: unknown;
  focus: FocusChecklist;
};

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toIdeaView(idea: Idea): IdeaView {
  const scores = idea.scores as IdeaView["scores"];
  const businessFit = idea.businessFit as IdeaView["businessFit"];
  const community = idea.community as { channels?: Channel[] };
  const frameworks = idea.frameworks as IdeaView["frameworks"];
  return {
    id: idea.id,
    slug: idea.slug,
    title: idea.title,
    summary: idea.summary,
    status: idea.status,
    publishedAt: idea.publishedAt,
    dataMode: idea.dataMode,
    tags: arr<string>(idea.tags),
    pitch: idea.pitch,
    keyword: idea.keyword,
    keywordVolume: idea.keywordVolume,
    keywordGrowth: idea.keywordGrowth,
    keywordCountry: idea.keywordCountry,
    keywordSeries: arr(idea.keywordSeries),
    keywordAsOf: idea.keywordAsOf,
    keywordSource: idea.keywordSource,
    scores,
    businessFit,
    channels: community.channels ?? [],
    offerLadder: arr(idea.offerLadder),
    whyNow: idea.whyNow,
    proof: idea.proof,
    marketGap: idea.marketGap,
    executionPlan: idea.executionPlan,
    frameworks,
    requirements: idea.requirements as IdeaRequirements,
    sources: arr(idea.sources),
    category: idea.category,
    market: idea.market,
    ideaType: idea.ideaType === "APP" || idea.ideaType === "DIGITAL" ? idea.ideaType : "SAAS",
    searchEvidence: isSearchEvidence(idea.searchEvidence) ? idea.searchEvidence : null,
    difficulty: idea.difficulty,
    capitalBand: idea.capitalBand,
    opportunity: idea.opportunity,
    pain: idea.pain,
    buildability: idea.buildability,
    timing: idea.timing,
    growth: idea.growth,
    buildBrief: idea.buildBrief,
    focus:
      readFocusChecklist(idea.focusChecklist) ??
      checklistFromIdeaFields({
        title: idea.title,
        summary: idea.summary,
        target: businessFit.target,
        offerDetail: arr<{ detail?: string }>(idea.offerLadder)[0]?.detail,
        price: arr<{ price?: string }>(idea.offerLadder)[0]?.price,
        channel: community.channels?.[0]?.name,
        executionPlan: idea.executionPlan,
      }),
  };
}

export function formatVolume(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function formatGrowth(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}
