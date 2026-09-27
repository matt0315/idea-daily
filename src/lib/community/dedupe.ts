import { jaccard, tokens } from "../pipeline/cluster";
import type { SearchEvidence, SearchEvidenceSuggestion } from "../autocomplete/evidence";

export type DedupRow = {
  id: string;
  title: string;
  niche: string;
  cluster: string;
  embedding?: number[] | null;
};

const TITLE_THRESHOLD = 0.62;
const EMBEDDING_THRESHOLD = 0.88;

export function stemToken(token: string): string {
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function titleTokens(value: string): Set<string> {
  return new Set([...tokens(value)].map(stemToken));
}

export function titleSimilarity(left: string, right: string): number {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;
  return jaccard(titleTokens(left), titleTokens(right));
}

export function cosineSimilarity(left: number[], right: number[]): number | null {
  if (left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return null;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function parseVector(value: string | null | undefined): number[] | null {
  if (!value) return null;
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return null;
  const numbers = inner.split(",").map((part) => Number(part.trim()));
  if (numbers.some((number) => !Number.isFinite(number))) return null;
  return numbers;
}

/**
 * Same niche and cluster wins. Otherwise an embedding match when both vectors exist.
 * Missing embeddings fall through to title similarity.
 */
export function dedupMatch(existing: DedupRow[], incoming: DedupRow): DedupRow | null {
  const niche = incoming.niche.trim().toLowerCase();
  const cluster = incoming.cluster.trim().toLowerCase();
  if (niche && cluster) {
    const exact = existing.find((row) => row.niche.trim().toLowerCase() === niche && row.cluster.trim().toLowerCase() === cluster);
    if (exact) return exact;
  }

  const incomingVector = incoming.embedding ?? null;
  if (incomingVector && incomingVector.length > 0) {
    let best: { row: DedupRow; score: number } | null = null;
    for (const row of existing) {
      const vector = row.embedding ?? null;
      if (!vector) continue;
      const score = cosineSimilarity(incomingVector, vector);
      if (score == null) continue;
      if (!best || score > best.score) best = { row, score };
    }
    if (best && best.score >= EMBEDDING_THRESHOLD) return best.row;
  }

  let lexical: { row: DedupRow; score: number } | null = null;
  for (const row of existing) {
    const score = Math.max(titleSimilarity(incoming.title, row.title), titleSimilarity(incoming.title, row.niche));
    if (!lexical || score > lexical.score) lexical = { row, score };
  }
  if (lexical && lexical.score >= TITLE_THRESHOLD) return lexical.row;
  return null;
}

export function mergeEvidence(existing: SearchEvidence | null, incoming: SearchEvidence): SearchEvidence {
  if (!existing) {
    return { ...incoming, suggestions: incoming.suggestions.map((item) => ({ ...item })) };
  }
  const seen = new Set(existing.suggestions.map((item) => item.text.trim().toLowerCase()));
  const suggestions: SearchEvidenceSuggestion[] = existing.suggestions.map((item) => ({ ...item }));
  for (const item of incoming.suggestions) {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ ...item });
  }
  const note = existing.note.includes(incoming.asOf)
    ? existing.note
    : `${existing.note} Additional phrases from an anonymised community mine dated ${incoming.asOf}.`.trim();
  return {
    ...existing,
    note,
    suggestions,
    volume: existing.volume ?? incoming.volume,
    volumeNote: existing.volumeNote ?? incoming.volumeNote,
  };
}
