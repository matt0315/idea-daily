import { computeScores, type CapitalBand } from "../scoring";
import type { SuggestionCluster } from "./cluster";
import type { IdeaTypeCode } from "./copy";

export const PRODUCT_TYPES = [
  { id: "saas", label: "SaaS", ideaType: "SAAS", buildWeeks: 3, capitalBand: "low" },
  { id: "app", label: "App", ideaType: "APP", buildWeeks: 4, capitalBand: "low" },
  { id: "checklist", label: "Checklist", ideaType: "DIGITAL", buildWeeks: 1, capitalBand: "none" },
  { id: "tracker", label: "Tracker / spreadsheet", ideaType: "DIGITAL", buildWeeks: 1, capitalBand: "none" },
  { id: "ebook", label: "Ebook", ideaType: "DIGITAL", buildWeeks: 2, capitalBand: "none" },
  { id: "template", label: "Template", ideaType: "DIGITAL", buildWeeks: 1, capitalBand: "none" },
  { id: "course", label: "Course", ideaType: "DIGITAL", buildWeeks: 3, capitalBand: "low" },
  { id: "prompt-pack", label: "Prompt pack", ideaType: "DIGITAL", buildWeeks: 1, capitalBand: "none" },
] as const;

export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];

export type MinedDraft = {
  title: string;
  summary: string;
  productType: ProductTypeId;
  productLabel: string;
  ideaType: IdeaTypeCode;
  searches: string[];
  clusterId: string;
  clusterLabel: string;
  clusterKind: SuggestionCluster["kind"];
  scores: { opportunity: number; pain: number; buildability: number; timing: number };
};

const ANGLES: Record<ProductTypeId, string[]> = {
  saas: ["Single-job seat", "Monday digest", "Deposit desk", "Reminder seat", "Handoff inbox", "Price-book page", "Status board", "Exception list", "Follow-up queue", "One-screen scheduler"],
  app: ["Field capture app", "Photo inbox", "On-site timer", "Client pocket app", "Reminder app", "Checklist app", "Deposit app", "Route app", "Voice note app", "Offline log app"],
  checklist: ["One-page checklist", "Laminated bench card", "Photo shot list", "Closeout checklist", "First-visit card", "Monday opening list", "Handoff checklist", "Quote-ready list", "No-show card", "End-of-day list"],
  tracker: ["Deposit tracker", "Job-cost sheet", "No-show log", "Quote aging sheet", "Photo tracker", "Follow-up sheet", "Material log", "Weekly scorecard", "Exception sheet", "Season tracker"],
  ebook: ["Field guide", "Pricing primer", "First-ten-jobs guide", "Photo standard", "Handoff manual", "Season playbook", "Quote script", "Reminder guide", "Closeout manual", "Owner briefing"],
  template: ["Quote template", "Intake template", "Handoff template", "Invoice template", "Reminder template", "Proposal one-pager", "Job card", "Welcome pack", "Change-order sheet", "Weekly agenda"],
  course: ["Five-lesson workshop", "Quote clinic", "Photo workshop", "Pricing clinic", "Handoff lesson", "Reminder clinic", "Closeout workshop", "First-client lesson", "Season course", "Office-hour series"],
  "prompt-pack": ["Quote prompt pack", "Photo prompt pack", "Follow-up prompts", "Intake prompts", "Pricing prompts", "Handoff prompts", "Reminder prompts", "Exception prompts", "Welcome prompts", "Review prompts"],
};

export function productById(id: string) {
  return PRODUCT_TYPES.find((product) => product.id === id) ?? PRODUCT_TYPES[0];
}

export function productForCluster(cluster: SuggestionCluster): ProductTypeId {
  const blob = `${cluster.label} ${cluster.suggestions.map((suggestion) => suggestion.text).join(" ")}`.toLowerCase();
  if (/\bchecklist\b/.test(blob)) return "checklist";
  if (/\b(tracker|spreadsheet)\b/.test(blob)) return "tracker";
  if (/\bebook\b/.test(blob)) return "ebook";
  if (/\btemplate\b/.test(blob)) return "template";
  if (/\bcourse\b/.test(blob)) return "course";
  if (/\bprompt\b/.test(blob)) return "prompt-pack";
  if (/\bapp\b/.test(blob)) return "app";
  return "saas";
}

function searchesFor(cluster: SuggestionCluster, index: number): string[] {
  const list = cluster.suggestions.map((suggestion) => suggestion.text);
  if (list.length === 0) return [];
  const start = index % list.length;
  const picked = [list[start]];
  const next = list[(start + 1) % list.length];
  if (next && next !== picked[0]) picked.push(next);
  return picked;
}

/**
 * About ten deterministic ideas for one cluster.
 * Every search string is copied from the cluster. Nothing is invented as a source.
 */
export function ideasForCluster(niche: string, cluster: SuggestionCluster, productType: string, count = 10): MinedDraft[] {
  const product = productById(productType);
  const angles = ANGLES[product.id];
  const total = Math.max(1, Math.min(12, count));
  const seed = niche.trim() || "this niche";
  const volume = cluster.volume ?? 0;
  const inputs = {
    monthlyVolume: volume,
    growthPct: 0,
    competitorCount: 4,
    painQuoteCount: 0,
    painSeverityAvg: cluster.kind === "problem" ? 3 : 2,
    buildWeeks: product.buildWeeks,
    capitalBand: product.capitalBand as CapitalBand,
    regulatoryLoad: 0,
    dependencyRisk: 1,
    timingSignals: Math.min(4, cluster.count),
  };
  const scores = computeScores(inputs);
  const scoreBlock = {
    opportunity: scores.opportunity,
    pain: scores.pain,
    buildability: scores.buildability,
    timing: scores.timing,
  };

  return Array.from({ length: total }, (_, index) => {
    const searches = searchesFor(cluster, index);
    const focus = searches[0] || cluster.label;
    const angle = angles[index % angles.length];
    return {
      title: `${angle} for ${seed}`,
      summary: `${product.label} aimed at people who start the search “${focus}”. The other phrase in this pair is ${searches[1] ? `“${searches[1]}”` : "the same line"}. Scores use the public formula with ${cluster.volume == null ? "unmeasured volume" : `a measured volume of ${cluster.volume}`}. Autocomplete lines are not customer quotes.`,
      productType: product.id,
      productLabel: product.label,
      ideaType: product.ideaType,
      searches,
      clusterId: cluster.id,
      clusterLabel: cluster.label,
      clusterKind: cluster.kind,
      scores: scoreBlock,
    };
  });
}

export function isMinedDraft(value: unknown): value is MinedDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as MinedDraft;
  return typeof draft.title === "string" && Array.isArray(draft.searches) && typeof draft.clusterId === "string";
}

export function readDrafts(value: unknown): MinedDraft[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isMinedDraft);
}
