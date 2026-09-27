import type { SuggestionHit } from "./cluster";
import { marketByCode } from "./markets";
import { sampleSuggestionsForNiche } from "./sample";

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/autocomplete/live/advanced";
const UNOFFICIAL_ENDPOINT = "https://suggestqueries.google.com/complete/search";
const TIMEOUT_MS = 12000;
const CONCURRENCY = 4;

export type FetchResult = {
  hits: SuggestionHit[];
  source: "dataforseo" | "unofficial" | "sample";
  dataMode: "SAMPLE" | "LIVE";
  note: string;
};

export function dataForSeoConfigured(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

/** Off unless the operator sets the flag exactly to "true". */
export function unofficialAutocompleteEnabled(): boolean {
  return process.env.ALLOW_UNOFFICIAL_AUTOCOMPLETE === "true";
}

type DfsBody = {
  tasks?: {
    status_code?: number;
    result?: { items?: { suggestion?: string; search_query_url?: string }[] | null }[] | null;
  }[];
};

export function suggestionsFromDataForSeo(body: DfsBody, query: string): SuggestionHit[] {
  const task = body.tasks?.[0];
  if (task?.status_code && task.status_code !== 20000) return [];
  const items = task?.result?.[0]?.items ?? [];
  const hits: SuggestionHit[] = [];
  for (const item of items) {
    const text = item.suggestion?.trim();
    if (!text) continue;
    hits.push({ text, query, url: item.search_query_url || undefined });
  }
  return hits;
}

export function suggestionsFromUnofficial(body: unknown, query: string): SuggestionHit[] {
  if (!Array.isArray(body) || !Array.isArray(body[1])) return [];
  return body[1]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((text) => ({ text: text.trim(), query }));
}

function dedupe(hits: SuggestionHit[]): SuggestionHit[] {
  const seen = new Set<string>();
  const unique: SuggestionHit[] = [];
  for (const hit of hits) {
    const key = hit.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hit);
  }
  return unique;
}

async function fetchText(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  const width = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: width }, () => run()));
  return results;
}

async function fetchDataForSeo(queries: string[], country: string, language: string): Promise<SuggestionHit[]> {
  const login = process.env.DATAFORSEO_LOGIN || "";
  const password = process.env.DATAFORSEO_PASSWORD || "";
  const token = Buffer.from(`${login}:${password}`).toString("base64");
  const locationCode = marketByCode(country).locationCode;
  const batches = await mapPool(queries, CONCURRENCY, async (query) => {
    try {
      const response = await fetchText(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([{ keyword: query, location_code: locationCode, language_code: language }]),
      });
      if (!response.ok) return [];
      const body = (await response.json()) as DfsBody;
      return suggestionsFromDataForSeo(body, query);
    } catch {
      return [];
    }
  });
  return dedupe(batches.flat());
}

async function fetchUnofficial(queries: string[], country: string, language: string): Promise<SuggestionHit[]> {
  const gl = marketByCode(country).gl;
  const batches = await mapPool(queries, CONCURRENCY, async (query) => {
    try {
      const url = new URL(UNOFFICIAL_ENDPOINT);
      url.searchParams.set("client", "firefox");
      url.searchParams.set("hl", language);
      url.searchParams.set("gl", gl);
      url.searchParams.set("q", query);
      const response = await fetchText(url.toString());
      if (!response.ok) return [];
      const body = (await response.json()) as unknown;
      return suggestionsFromUnofficial(body, query);
    } catch {
      return [];
    }
  });
  return dedupe(batches.flat());
}

export async function fetchAutocompleteSuggestions(niche: string, queries: string[], country: string, language: string): Promise<FetchResult> {
  if (dataForSeoConfigured() && queries.length > 0) {
    const hits = await fetchDataForSeo(queries, country, language);
    if (hits.length > 0) {
      return {
        hits,
        source: "dataforseo",
        dataMode: "LIVE",
        note: "Suggestions from DataForSEO Google Autocomplete. They are searches people start, not proof someone will pay.",
      };
    }
  } else if (unofficialAutocompleteEnabled() && queries.length > 0) {
    const hits = await fetchUnofficial(queries, country, language);
    if (hits.length > 0) {
      return {
        hits,
        source: "unofficial",
        dataMode: "LIVE",
        note: "Suggestions from an unofficial autocomplete endpoint. It is off unless ALLOW_UNOFFICIAL_AUTOCOMPLETE=true, and using it may conflict with the site’s terms. Prefer DataForSEO.",
      };
    }
  }
  return {
    hits: sampleSuggestionsForNiche(niche),
    source: "sample",
    dataMode: "SAMPLE",
    note: "Sample phrases generated because no autocomplete provider returned results. They are not live Google suggestions.",
  };
}
