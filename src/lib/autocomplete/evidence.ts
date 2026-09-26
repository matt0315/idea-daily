import type { ClusterKind, SuggestionCluster } from "./cluster";

export type SearchEvidenceSuggestion = {
  text: string;
  kind: ClusterKind;
  cluster: string;
};

export type SearchEvidence = {
  niche: string;
  country: string;
  language: string;
  source: string;
  dataMode: "SAMPLE" | "LIVE";
  asOf: string;
  note: string;
  suggestions: SearchEvidenceSuggestion[];
  volume: number | null;
  volumeNote: string | null;
};

export function evidenceForCluster(input: {
  niche: string;
  country: string;
  language: string;
  source: string;
  dataMode: "SAMPLE" | "LIVE";
  note: string;
  cluster: SuggestionCluster;
}): SearchEvidence {
  return {
    niche: input.niche,
    country: input.country,
    language: input.language,
    source: input.source,
    dataMode: input.dataMode,
    asOf: new Date().toISOString().slice(0, 10),
    note: input.note,
    suggestions: input.cluster.suggestions.map((suggestion) => ({
      text: suggestion.text,
      kind: input.cluster.kind,
      cluster: input.cluster.label,
    })),
    volume: input.cluster.volume,
    volumeNote:
      input.cluster.volume == null
        ? null
        : "Cluster volume is the highest DataForSEO Google Ads figure returned for a phrase in this cluster. The call is the existing United States volume lookup.",
  };
}

export function isSearchEvidence(value: unknown): value is SearchEvidence {
  if (!value || typeof value !== "object") return false;
  const record = value as SearchEvidence;
  return typeof record.niche === "string" && Array.isArray(record.suggestions);
}
