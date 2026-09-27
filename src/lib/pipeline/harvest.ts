import type { Signal } from "./cluster";
import { sampleSignals } from "./sample-signals";

const TIMEOUT_MS = 8000;

async function fetchText(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function live(partial: Omit<Signal, "sample" | "capturedAt">): Signal {
  return { ...partial, sample: false, capturedAt: new Date().toISOString() };
}

export async function harvestHackerNews(): Promise<Signal[]> {
  try {
    const response = await fetchText(
      "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=15&query=startup",
    );
    if (!response.ok) throw new Error(`HN ${response.status}`);
    const body = (await response.json()) as { hits?: { title?: string; url?: string; objectID?: string; points?: number }[] };
    const hits = body.hits ?? [];
    if (hits.length === 0) throw new Error("HN empty");
    return hits.slice(0, 12).map((hit) =>
      live({
        source: "hackernews",
        title: hit.title || "Untitled HN story",
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        text: hit.title || "",
        score: Math.min(100, 20 + (hit.points ?? 0)),
      }),
    );
  } catch {
    return sampleSignals().filter((signal) => signal.source === "hackernews");
  }
}

export async function harvestProductHunt(): Promise<Signal[]> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token) return sampleSignals().filter((signal) => signal.source === "producthunt");
  try {
    const response = await fetchText("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query { posts(first: 12, order: VOTES) { edges { node { name tagline url votesCount } } } }`,
      }),
    });
    if (!response.ok) throw new Error(`PH ${response.status}`);
    const body = (await response.json()) as {
      data?: { posts?: { edges?: { node: { name: string; tagline: string; url: string; votesCount: number } }[] } };
    };
    const edges = body.data?.posts?.edges ?? [];
    if (edges.length === 0) throw new Error("PH empty");
    return edges.map((edge) =>
      live({
        source: "producthunt",
        title: edge.node.name,
        url: edge.node.url,
        text: edge.node.tagline,
        score: Math.min(100, 15 + Math.round((edge.node.votesCount ?? 0) / 10)),
      }),
    );
  } catch {
    return sampleSignals().filter((signal) => signal.source === "producthunt");
  }
}

export async function harvestYouTube(): Promise<Signal[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return sampleSignals().filter((signal) => signal.source === "youtube");
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", "small business workflow software");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("order", "date");
    url.searchParams.set("key", key);
    const response = await fetchText(url.toString());
    if (!response.ok) throw new Error(`YT ${response.status}`);
    const body = (await response.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string } }[];
    };
    const items = body.items ?? [];
    if (items.length === 0) throw new Error("YT empty");
    return items.map((item) =>
      live({
        source: "youtube",
        title: item.snippet?.title || "YouTube video",
        url: `https://www.youtube.com/watch?v=${item.id?.videoId ?? ""}`,
        text: item.snippet?.description || "",
        score: 40,
      }),
    );
  } catch {
    return sampleSignals().filter((signal) => signal.source === "youtube");
  }
}

export async function harvestAppleCharts(): Promise<Signal[]> {
  try {
    const response = await fetchText("https://rss.applemarketingtools.com/api/v2/us/apps/top-free/25/apps.json");
    if (!response.ok) throw new Error(`Apple ${response.status}`);
    const body = (await response.json()) as { feed?: { results?: { name?: string; url?: string; artistName?: string }[] } };
    const results = body.feed?.results ?? [];
    if (results.length === 0) throw new Error("Apple empty");
    return results.slice(0, 10).map((app, index) =>
      live({
        source: "apple_rss",
        title: app.name || "App Store app",
        url: app.url || "https://apps.apple.com",
        text: `${app.name ?? ""} ${app.artistName ?? ""}`,
        score: Math.max(20, 70 - index * 4),
      }),
    );
  } catch {
    return sampleSignals().filter((signal) => signal.source === "apple_rss");
  }
}

export async function harvestSearchVolume(keywords: string[]): Promise<Signal[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password || keywords.length === 0) {
    return sampleSignals().filter((signal) => signal.source === "dataforseo");
  }
  try {
    const token = Buffer.from(`${login}:${password}`).toString("base64");
    const response = await fetchText(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([{ keywords: keywords.slice(0, 20), location_code: 2840, language_code: "en" }]),
      },
    );
    if (!response.ok) throw new Error(`DFS ${response.status}`);
    const body = (await response.json()) as {
      tasks?: { result?: { keyword?: string; search_volume?: number }[] }[];
    };
    const rows = body.tasks?.[0]?.result ?? [];
    if (rows.length === 0) throw new Error("DFS empty");
    return rows.map((row) =>
      live({
        source: "dataforseo",
        title: row.keyword || "keyword",
        url: "https://dataforseo.com/",
        text: `${row.keyword ?? ""} volume ${row.search_volume ?? 0}`,
        score: Math.min(100, 10 + Math.log10((row.search_volume ?? 0) + 10) * 20),
      }),
    );
  } catch {
    return sampleSignals().filter((signal) => signal.source === "dataforseo");
  }
}

export async function harvestWebSearch(query: string): Promise<Signal[]> {
  const tavily = process.env.TAVILY_API_KEY;
  const brave = process.env.BRAVE_SEARCH_API_KEY;
  const exa = process.env.EXA_API_KEY;
  try {
    if (tavily) {
      const response = await fetchText("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: tavily, query, max_results: 8 }),
      });
      if (!response.ok) throw new Error(`Tavily ${response.status}`);
      const body = (await response.json()) as { results?: { title?: string; url?: string; content?: string }[] };
      return (body.results ?? []).map((result) =>
        live({
          source: "web_search",
          title: result.title || query,
          url: result.url || "https://tavily.com",
          text: result.content || "",
          score: 50,
        }),
      );
    }
    if (brave) {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", "8");
      const response = await fetchText(url.toString(), { headers: { "X-Subscription-Token": brave } });
      if (!response.ok) throw new Error(`Brave ${response.status}`);
      const body = (await response.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } };
      return (body.web?.results ?? []).map((result) =>
        live({
          source: "web_search",
          title: result.title || query,
          url: result.url || "https://brave.com",
          text: result.description || "",
          score: 50,
        }),
      );
    }
    if (exa) {
      const response = await fetchText("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": exa },
        body: JSON.stringify({ query, numResults: 8, contents: { text: { maxCharacters: 400 } } }),
      });
      if (!response.ok) throw new Error(`Exa ${response.status}`);
      const body = (await response.json()) as { results?: { title?: string; url?: string; text?: string }[] };
      return (body.results ?? []).map((result) =>
        live({
          source: "web_search",
          title: result.title || query,
          url: result.url || "https://exa.ai",
          text: result.text || "",
          score: 50,
        }),
      );
    }
  } catch {
    return sampleSignals().filter((signal) => signal.source === "web_search");
  }
  return sampleSignals().filter((signal) => signal.source === "web_search");
}

export async function harvestAll(): Promise<{ signals: Signal[]; anySample: boolean }> {
  const groups = await Promise.all([
    harvestHackerNews(),
    harvestProductHunt(),
    harvestYouTube(),
    harvestAppleCharts(),
    harvestSearchVolume(["contractor scheduling software", "clinic shift handoff"]),
    harvestWebSearch("small business workflow pain"),
  ]);
  const signals = groups.flat();
  return { signals, anySample: signals.some((signal) => signal.sample) };
}
