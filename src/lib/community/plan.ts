import type { GroupedSuggestions, SuggestionCluster } from "../autocomplete/cluster";
import { topClusters } from "../autocomplete/cluster";
import type { SearchEvidence } from "../autocomplete/evidence";
import type { MinedDraft } from "../autocomplete/ideas";
import { productForCluster } from "../autocomplete/ideas";
import type { Plan } from "../gating";
import { anonymizeText, isPublicSafe } from "./anonymize";
import { dedupMatch, mergeEvidence, type DedupRow } from "./dedupe";
import { COMMUNITY_SOURCE, shouldRelease } from "./policy";

export type PublicDraft = {
  title: string;
  summary: string;
  niche: string;
  cluster: string;
  clusterKind: SuggestionCluster["kind"];
  searches: string[];
  minedOn: string;
  country: string;
  language: string;
  dataMode: "SAMPLE" | "LIVE";
  provider: string;
  ideaType: "SAAS" | "APP" | "DIGITAL";
  productType: string;
};

export type ReleaseSkip = { type: "skip"; id: string; reason: "not-due" | "opt-out" | "already" | "empty" };
export type ReleaseCreate = { type: "create"; sourceId: string; draft: PublicDraft; evidence: SearchEvidence };
export type ReleaseMerge = { type: "merge"; sourceId: string; ideaId: string; evidence: SearchEvidence; tags: string[] };
export type ReleaseMark = { type: "mark"; kind: "mine" | "research" | "trend"; id: string };
export type ReleaseAction = ReleaseSkip | ReleaseCreate | ReleaseMerge | ReleaseMark;

type ReleaseMeta = {
  id: string;
  createdAt: Date;
  releasedAt: Date | null;
  plan: Plan;
  optOut: boolean;
  secrets: string[];
};

function minedOn(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function evidenceFor(draft: PublicDraft, note: string): SearchEvidence {
  return {
    niche: draft.niche,
    country: draft.country,
    language: draft.language,
    source: COMMUNITY_SOURCE,
    dataMode: draft.dataMode,
    asOf: draft.minedOn,
    note,
    suggestions: draft.searches.map((text) => ({ text, kind: draft.clusterKind, cluster: draft.cluster })),
    volume: null,
    volumeNote: null,
  };
}

function safeDraft(draft: PublicDraft, secrets: string[]): PublicDraft | null {
  const cleaned: PublicDraft = {
    ...draft,
    title: anonymizeText(draft.title, secrets),
    summary: anonymizeText(draft.summary, secrets),
    searches: draft.searches.map((search) => anonymizeText(search, secrets)).filter((search) => search.length > 1),
    niche: anonymizeText(draft.niche, secrets),
    cluster: anonymizeText(draft.cluster, secrets),
  };
  if (!cleaned.title || cleaned.searches.length === 0) return null;
  if (!isPublicSafe(cleaned, secrets)) return null;
  return cleaned;
}

function collapse(drafts: PublicDraft[]): PublicDraft[] {
  const groups = new Map<string, PublicDraft>();
  for (const draft of drafts) {
    const key = `${draft.niche.trim().toLowerCase()}|${draft.cluster.trim().toLowerCase()}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...draft, searches: [...draft.searches] });
      continue;
    }
    const seen = new Set(current.searches.map((search) => search.toLowerCase()));
    for (const search of draft.searches) {
      if (!seen.has(search.toLowerCase())) {
        seen.add(search.toLowerCase());
        current.searches.push(search);
      }
    }
  }
  return [...groups.values()].slice(0, 4);
}

function planDrafts(sourceId: string, drafts: PublicDraft[], existing: DedupRow[], secrets: string[]): ReleaseAction[] {
  const actions: ReleaseAction[] = [];
  const created = new Map<string, ReleaseCreate>();
  const pool = existing.map((row) => ({ ...row }));
  let creates = 0;
  for (const draft of collapse(drafts)) {
    const safe = safeDraft(draft, secrets);
    if (!safe) continue;
    const evidence = evidenceFor(
      safe,
      `Source: ${COMMUNITY_SOURCE}. Original mine date ${safe.minedOn}. Phrases are anonymised. No account, name, email, or project title is attached.`,
    );
    if (!isPublicSafe(evidence, secrets)) continue;
    const match = dedupMatch(pool, {
      id: "",
      title: safe.title,
      niche: safe.niche,
      cluster: safe.cluster,
    });
    if (match?.id.startsWith("pending:")) {
      const prior = created.get(match.id);
      if (prior) {
        prior.evidence = mergeEvidence(prior.evidence, evidence);
        const seen = new Set(prior.draft.searches.map((search) => search.toLowerCase()));
        for (const search of safe.searches) {
          if (!seen.has(search.toLowerCase())) prior.draft.searches.push(search);
        }
      }
      continue;
    }
    if (match) {
      actions.push({ type: "merge", sourceId, ideaId: match.id, evidence, tags: [COMMUNITY_SOURCE] });
      continue;
    }
    if (creates >= 4) continue;
    const pendingId = `pending:${sourceId}:${creates}`;
    const action: ReleaseCreate = { type: "create", sourceId, draft: safe, evidence };
    actions.push(action);
    created.set(pendingId, action);
    pool.push({ id: pendingId, title: safe.title, niche: safe.niche, cluster: safe.cluster });
    creates += 1;
  }
  return actions;
}

function gate(meta: ReleaseMeta, now: Date, delayDays: number): ReleaseSkip | null {
  if (meta.releasedAt) return { type: "skip", id: meta.id, reason: "already" };
  if (meta.plan === "PRO" && meta.optOut) return { type: "skip", id: meta.id, reason: "opt-out" };
  if (!shouldRelease(meta, now, delayDays)) return { type: "skip", id: meta.id, reason: "not-due" };
  return null;
}

export function draftsFromMine(input: {
  niche: string;
  country: string;
  language: string;
  dataMode: "SAMPLE" | "LIVE";
  provider: string;
  createdAt: Date;
  groups: GroupedSuggestions;
  ideas: MinedDraft[];
}): PublicDraft[] {
  const date = minedOn(input.createdAt);
  if (input.ideas.length > 0) {
    return input.ideas.map((idea) => ({
      title: idea.title,
      summary: idea.summary,
      niche: input.niche,
      cluster: idea.clusterLabel,
      clusterKind: idea.clusterKind,
      searches: idea.searches,
      minedOn: date,
      country: input.country,
      language: input.language,
      dataMode: input.dataMode,
      provider: input.provider,
      ideaType: idea.ideaType,
      productType: idea.productType,
    }));
  }
  return topClusters(input.groups, 2).map((cluster) => {
    const product = productForCluster(cluster);
    return {
      title: cluster.label,
      summary: `Anonymised cluster from searches around ${input.niche}.`,
      niche: input.niche,
      cluster: cluster.label,
      clusterKind: cluster.kind,
      searches: cluster.suggestions.map((suggestion) => suggestion.text),
      minedOn: date,
      country: input.country,
      language: input.language,
      dataMode: input.dataMode,
      provider: input.provider,
      ideaType: product === "app" ? "APP" : product === "saas" ? "SAAS" : "DIGITAL",
      productType: product,
    };
  });
}

export function planMineRelease(
  meta: ReleaseMeta & {
    niche: string;
    country: string;
    language: string;
    dataMode: "SAMPLE" | "LIVE";
    provider: string;
    groups: GroupedSuggestions;
    ideas: MinedDraft[];
  },
  existing: DedupRow[],
  now: Date,
  delayDays: number,
): ReleaseAction[] {
  const skipped = gate(meta, now, delayDays);
  if (skipped) return [skipped];
  const drafts = draftsFromMine(meta);
  if (drafts.length === 0) return [{ type: "skip", id: meta.id, reason: "empty" }, { type: "mark", kind: "mine", id: meta.id }];
  return [...planDrafts(meta.id, drafts, existing, meta.secrets), { type: "mark", kind: "mine", id: meta.id }];
}

export function planTextRelease(
  meta: ReleaseMeta & {
    kind: "research" | "trend";
    title: string;
    summary: string;
    niche: string;
    country: string;
    searches: string[];
    dataMode: "SAMPLE" | "LIVE";
  },
  existing: DedupRow[],
  now: Date,
  delayDays: number,
): ReleaseAction[] {
  const skipped = gate(meta, now, delayDays);
  if (skipped) return [skipped];
  const draft: PublicDraft = {
    title: meta.title,
    summary: meta.summary,
    niche: meta.niche,
    cluster: meta.niche,
    clusterKind: "desire",
    searches: meta.searches.length > 0 ? meta.searches : [meta.title],
    minedOn: minedOn(meta.createdAt),
    country: meta.country,
    language: "en",
    dataMode: meta.dataMode,
    provider: meta.kind,
    ideaType: "SAAS",
    productType: "saas",
  };
  return [...planDrafts(meta.id, [draft], existing, meta.secrets), { type: "mark", kind: meta.kind, id: meta.id }];
}

export function withCommunityTag(tags: string[]): string[] {
  if (tags.includes(COMMUNITY_SOURCE)) return tags;
  return [COMMUNITY_SOURCE, ...tags];
}
