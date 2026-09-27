import type { Prisma, PrismaClient } from "@prisma/client";
import { harvestSearchVolume } from "../pipeline/harvest";
import { findCluster, groupSuggestions, type GroupedSuggestions, type SuggestionCluster, type SuggestionHit } from "./cluster";
import { expandSeedQueries } from "./expand";
import { fetchAutocompleteSuggestions } from "./fetch";
import { ideasForCluster, isMinedDraft, productById, readDrafts, type MinedDraft } from "./ideas";
import { completeText, llmConfigured } from "../llm";
import { isCacheFresh } from "../community/policy";
import { releaseDelayDays } from "../community/settings";
import { normalizeCountry, normalizeLanguage, normalizeNiche } from "./markets";

export type MinePayload = {
  niche: string;
  country: string;
  language: string;
  groups: GroupedSuggestions;
  suggestions: SuggestionHit[];
  source: string;
  dataMode: "SAMPLE" | "LIVE";
  note: string;
  cacheHit: boolean;
};

function volumeFromSignal(title: string, text: string): { keyword: string; volume: number } | null {
  const match = text.match(/volume\s+(\d+)/i);
  if (!match) return null;
  return { keyword: title.trim().toLowerCase(), volume: Number(match[1]) };
}

export async function enrichClusterVolumes(groups: GroupedSuggestions, country: string): Promise<GroupedSuggestions> {
  if (country !== "US") return groups;
  const clusters = [...groups.questions, ...groups.problems, ...groups.desires].slice(0, 8);
  const labels = clusters.map((cluster) => cluster.label).filter((label) => label.length > 1);
  if (labels.length === 0) return groups;
  const signals = await harvestSearchVolume(labels);
  const live = signals.filter((signal) => !signal.sample);
  if (live.length === 0) return groups;
  const volumes = new Map<string, number>();
  for (const signal of live) {
    const parsed = volumeFromSignal(signal.title, signal.text);
    if (parsed) volumes.set(parsed.keyword, parsed.volume);
  }
  const apply = (cluster: SuggestionCluster): SuggestionCluster => {
    const volume = volumes.get(cluster.label.trim().toLowerCase());
    if (volume == null) return cluster;
    return { ...cluster, volume };
  };
  return {
    questions: groups.questions.map(apply),
    problems: groups.problems.map(apply),
    desires: groups.desires.map(apply),
  };
}

export async function sharedMineIsFresh(db: PrismaClient, input: { niche: string; country: string; language: string }): Promise<boolean> {
  const niche = normalizeNiche(input.niche);
  const country = normalizeCountry(input.country);
  const language = normalizeLanguage(input.language);
  if (niche.length < 2) return false;
  const cached = await db.autocompleteCache.findUnique({
    where: { niche_country_language: { niche, country, language } },
  });
  if (!cached) return false;
  const windowDays = await releaseDelayDays(db);
  return isCacheFresh(cached.fetchedAt, new Date(), windowDays);
}

export async function mineNiche(db: PrismaClient, input: { niche: string; country: string; language: string }): Promise<MinePayload> {
  const niche = normalizeNiche(input.niche);
  const country = normalizeCountry(input.country);
  const language = normalizeLanguage(input.language);
  if (niche.length < 2) throw new Error("niche_short");

  const windowDays = await releaseDelayDays(db);
  const cached = await db.autocompleteCache.findUnique({
    where: { niche_country_language: { niche, country, language } },
  });
  if (cached && isCacheFresh(cached.fetchedAt, new Date(), windowDays)) {
    return {
      niche,
      country,
      language,
      groups: cached.groups as GroupedSuggestions,
      suggestions: cached.suggestions as SuggestionHit[],
      source: cached.source,
      dataMode: cached.dataMode,
      note: cached.dataMode === "SAMPLE"
        ? "Cached sample phrases shared across accounts. They are not live autocomplete results, and this view did not use a mine credit."
        : "Cached suggestions shared across accounts. This view did not call the provider again and did not use a mine credit.",
      cacheHit: true,
    };
  }

  const queries = expandSeedQueries(niche);
  const fetched = await fetchAutocompleteSuggestions(niche, queries, country, language);
  const groups = await enrichClusterVolumes(groupSuggestions(niche, fetched.hits), country);
  const row = {
    niche,
    country,
    language,
    suggestions: fetched.hits as unknown as Prisma.InputJsonValue,
    groups: groups as unknown as Prisma.InputJsonValue,
    source: fetched.source,
    dataMode: fetched.dataMode,
    drafts: {},
    fetchedAt: new Date(),
  };
  await db.autocompleteCache.upsert({
    where: { niche_country_language: { niche, country, language } },
    create: row,
    update: row,
  });
  return {
    niche,
    country,
    language,
    groups,
    suggestions: fetched.hits,
    source: fetched.source,
    dataMode: fetched.dataMode,
    note: fetched.note,
    cacheHit: false,
  };
}

function draftsFromModel(text: string, niche: string, cluster: SuggestionCluster, productType: string): MinedDraft[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: { ideas?: { title?: string; summary?: string; searchIndexes?: number[] }[] };
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as typeof parsed;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.ideas)) return null;
  const product = productById(productType);
  const fallback = ideasForCluster(niche, cluster, product.id, 10);
  const drafts: MinedDraft[] = [];
  for (const [index, idea] of parsed.ideas.entries()) {
    const title = idea.title?.trim();
    const summary = idea.summary?.trim();
    if (!title || !summary) continue;
    const indexes = Array.isArray(idea.searchIndexes) ? idea.searchIndexes : [];
    const searches = indexes
      .filter((value) => Number.isInteger(value) && value >= 0 && value < cluster.suggestions.length)
      .map((value) => cluster.suggestions[value].text);
    if (searches.length === 0) continue;
    const base = fallback[index] ?? fallback[0];
    drafts.push({
      ...base,
      title: title.slice(0, 120),
      summary: summary.slice(0, 600),
      searches: [...new Set(searches)].slice(0, 4),
      productType: product.id,
      productLabel: product.label,
      ideaType: product.ideaType,
    });
    if (drafts.length >= 10) break;
  }
  return drafts.length >= 3 ? drafts : null;
}

/** LLM titles when a provider is configured. Searches stay limited to the cluster. */
export async function draftIdeas(niche: string, cluster: SuggestionCluster, productType: string): Promise<{ ideas: MinedDraft[]; writer: string }> {
  const fallback = ideasForCluster(niche, cluster, productType, 10);
  if (!llmConfigured()) return { ideas: fallback, writer: "template" };
  const catalog = cluster.suggestions.map((suggestion, index) => `${index}. ${suggestion.text}`).join("\n");
  const product = productById(productType);
  const llm = await completeText(
    "You draft product ideas from search phrases the user already collected. Return JSON only: {\"ideas\":[{\"title\":\"\",\"summary\":\"\",\"searchIndexes\":[0]}]}. Write about 10 ideas. searchIndexes must point at the numbered phrases. Do not invent phrases, statistics, quotes, or company names. Summaries must mention only those phrases.",
    `Niche: ${niche}\nProduct type: ${product.label}\nPhrases:\n${catalog}`,
  );
  if (!llm.ok) return { ideas: fallback, writer: "template" };
  const parsed = draftsFromModel(llm.text, niche, cluster, productType);
  if (!parsed) return { ideas: fallback, writer: "template" };
  return { ideas: parsed, writer: llm.provider };
}

export function clusterFromUnknown(groups: unknown, clusterId: string): SuggestionCluster | null {
  if (!groups || typeof groups !== "object") return null;
  return findCluster(groups as GroupedSuggestions, clusterId);
}

export function asGroups(value: unknown): GroupedSuggestions {
  if (!value || typeof value !== "object") return { questions: [], problems: [], desires: [] };
  const record = value as GroupedSuggestions;
  return {
    questions: Array.isArray(record.questions) ? record.questions : [],
    problems: Array.isArray(record.problems) ? record.problems : [],
    desires: Array.isArray(record.desires) ? record.desires : [],
  };
}

export { readDrafts, isMinedDraft };
