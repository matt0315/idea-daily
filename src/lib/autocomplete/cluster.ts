import { jaccard } from "../pipeline/cluster";

export type ClusterKind = "question" | "problem" | "desire";

export type SuggestionHit = {
  text: string;
  query: string;
  url?: string;
  volume?: number | null;
};

export type SuggestionCluster = {
  id: string;
  kind: ClusterKind;
  label: string;
  suggestions: SuggestionHit[];
  count: number;
  volume: number | null;
};

export type GroupedSuggestions = {
  questions: SuggestionCluster[];
  problems: SuggestionCluster[];
  desires: SuggestionCluster[];
};

const QUESTION_START = /^(how|why|what|when|where|who|can|should|is|are|does|do|which|will)\b/i;
const PROBLEM_WORD =
  /\b(problem|problems|fail|fails|failed|failure|error|errors|hard|struggle|struggling|can't|cannot|cant|issue|issues|pain|painful|late|expensive|stuck|broken|worst|difficult|frustrat\w*|nightmare|overwhelmed)\b/i;

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "into", "about",
  "have", "has", "not", "but", "its", "our", "their", "they", "will", "can", "how", "what", "why",
  "when", "where", "who", "best", "top", "free", "app", "new", "just", "more", "than", "using",
  "use", "via", "per", "all", "any", "out", "get", "does", "did", "a", "an", "to", "of", "in", "on",
  "my", "is", "it", "or", "be", "at", "by", "do", "should",
]);

/** Question prefixes win, then problem words, otherwise the line is a desire. */
export function classifySuggestion(text: string): ClusterKind {
  const trimmed = text.trim();
  if (trimmed.endsWith("?") || QUESTION_START.test(trimmed)) return "question";
  if (PROBLEM_WORD.test(trimmed)) return "problem";
  return "desire";
}

function nicheTokens(niche: string): Set<string> {
  return new Set(niche.toLowerCase().split(/\s+/).filter(Boolean));
}

function clusterTokens(text: string, blocked: Set<string>): Set<string> {
  const parts = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2 && !STOP.has(part) && !blocked.has(part));
  if (parts.length === 0) return new Set([text.toLowerCase().replace(/\s+/g, " ").trim() || "phrase"]);
  return new Set(parts);
}

function labelFor(suggestions: SuggestionHit[], blocked: Set<string>): string {
  if (suggestions.length === 1) return suggestions[0].text;
  let best = suggestions[0].text;
  let bestScore = -1;
  for (const candidate of suggestions) {
    const own = clusterTokens(candidate.text, blocked);
    let total = 0;
    for (const other of suggestions) {
      if (other === candidate) continue;
      total += jaccard(own, clusterTokens(other.text, blocked));
    }
    const score = total / (suggestions.length - 1);
    if (score > bestScore || (score === bestScore && candidate.text.length < best.length)) {
      bestScore = score;
      best = candidate.text;
    }
  }
  return best;
}

function bucketClusters(kind: ClusterKind, hits: SuggestionHit[], blocked: Set<string>): SuggestionCluster[] {
  const clusters: { tokens: Set<string>; suggestions: SuggestionHit[] }[] = [];
  for (const hit of hits) {
    const own = clusterTokens(hit.text, blocked);
    let bestIndex = -1;
    let bestScore = 0;
    clusters.forEach((cluster, index) => {
      const score = jaccard(own, cluster.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore >= 0.34) {
      const cluster = clusters[bestIndex];
      cluster.suggestions.push(hit);
      for (const token of own) cluster.tokens.add(token);
    } else {
      clusters.push({ tokens: new Set(own), suggestions: [hit] });
    }
  }

  return clusters
    .map((cluster) => {
      const volumes = cluster.suggestions.map((hit) => hit.volume).filter((value): value is number => typeof value === "number");
      return {
        id: "",
        kind,
        label: labelFor(cluster.suggestions, blocked),
        suggestions: cluster.suggestions,
        count: cluster.suggestions.length,
        volume: volumes.length > 0 ? Math.max(...volumes) : null,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((cluster, index) => ({ ...cluster, id: `${kind}-${index + 1}` }));
}

export function emptyGroups(): GroupedSuggestions {
  return { questions: [], problems: [], desires: [] };
}

/** Groups raw suggestions into question, problem, and desire clusters. */
export function groupSuggestions(niche: string, suggestions: SuggestionHit[]): GroupedSuggestions {
  const blocked = nicheTokens(niche);
  const buckets: Record<ClusterKind, SuggestionHit[]> = { question: [], problem: [], desire: [] };
  const seen = new Set<string>();
  for (const suggestion of suggestions) {
    const text = suggestion.text.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = { ...suggestion, text };
    buckets[classifySuggestion(text)].push(hit);
  }
  return {
    questions: bucketClusters("question", buckets.question, blocked),
    problems: bucketClusters("problem", buckets.problem, blocked),
    desires: bucketClusters("desire", buckets.desire, blocked),
  };
}

export function topClusters(groups: GroupedSuggestions, limit: number): SuggestionCluster[] {
  return [...groups.questions, ...groups.problems, ...groups.desires]
    .filter((cluster) => cluster.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function findCluster(groups: GroupedSuggestions, id: string): SuggestionCluster | null {
  return [...groups.questions, ...groups.problems, ...groups.desires].find((cluster) => cluster.id === id) ?? null;
}
