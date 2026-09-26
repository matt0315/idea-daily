import { commercialIntent, filterTrendNoise, growthFromMonthlySeries } from "./trends";

export type TrendResearchRow = {
  keyword: string;
  volume: number | null;
  growthPct: number | null;
  intent: number;
  sample: boolean;
  series: number[];
};

export type TrendCluster = {
  name: string;
  explainer: string;
  keywords: string[];
};

export type TrendResearchResult = {
  seed: string;
  country: string;
  rows: TrendResearchRow[];
  clusters: TrendCluster[];
  dataMode: "SAMPLE" | "LIVE";
  note: string;
};

const MODIFIERS = ["software", "template", "checklist", "pricing", "for small business", "automation"];

/** Related-keyword sketch used when DataForSEO is not configured. Volumes stay null. */
export function researchSeedTerms(seed: string, country: string): TrendResearchResult {
  const cleaned = seed.trim().toLowerCase();
  const candidates = [cleaned, ...MODIFIERS.map((modifier) => `${cleaned} ${modifier}`)];
  const rows: TrendResearchRow[] = [];
  for (const keyword of candidates) {
    const noise = filterTrendNoise(keyword);
    if (!noise.keep) continue;
    const intent = commercialIntent(keyword);
    if (intent < 0.4 && keyword !== cleaned) continue;
    rows.push({
      keyword,
      volume: null,
      growthPct: null,
      intent: Math.round(intent * 100) / 100,
      sample: true,
      series: [],
    });
  }

  const clusters: TrendCluster[] = [
    {
      name: "Workflow software",
      explainer: `Tools that finish the “${cleaned}” chore for a specific operator. Intent is inferred from the words software, pricing, and automation — not from a keyword bill.`,
      keywords: rows.filter((row) => /software|automation|pricing/.test(row.keyword)).map((row) => row.keyword),
    },
    {
      name: "Do-it-yourself assets",
      explainer: "Templates and checklists people download before they will pay for software. Useful as a lead magnet, not as a market-size claim.",
      keywords: rows.filter((row) => /template|checklist/.test(row.keyword)).map((row) => row.keyword),
    },
    {
      name: "Buyer phrasing",
      explainer: `The plain phrase “${cleaned}” plus “for small business”, kept so you can see how the seed is searched without a volume attached.`,
      keywords: rows.filter((row) => /small business/.test(row.keyword) || row.keyword === cleaned).map((row) => row.keyword),
    },
  ].filter((cluster) => cluster.keywords.length > 0);

  return {
    seed: cleaned,
    country,
    rows,
    clusters,
    dataMode: "SAMPLE",
    note: "No keyword provider is configured. Rows are related phrases only. Volume and growth are blank on purpose. Growth, when present, is last 3 months versus the same 3 months a year earlier.",
  };
}

export function applyLiveVolumes(
  result: TrendResearchResult,
  volumes: { keyword: string; series: number[] }[],
): TrendResearchResult {
  const byKeyword = new Map(volumes.map((row) => [row.keyword.toLowerCase(), row.series]));
  const rows = result.rows.map((row) => {
    const series = byKeyword.get(row.keyword.toLowerCase());
    if (!series || series.length === 0) return row;
    const growthPct = growthFromMonthlySeries(series);
    return {
      ...row,
      series,
      volume: series[series.length - 1] ?? null,
      growthPct,
      sample: false,
    };
  });
  const anyLive = rows.some((row) => !row.sample);
  return {
    ...result,
    rows,
    dataMode: anyLive && rows.every((row) => !row.sample) ? "LIVE" : anyLive ? "SAMPLE" : "SAMPLE",
    note: anyLive
      ? "Some volumes came back from the keyword provider. Blank cells were not measured. Growth is last 3 months versus the same 3 months a year earlier."
      : result.note,
  };
}
