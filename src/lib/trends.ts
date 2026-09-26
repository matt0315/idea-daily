const NOISE_RULES: { re: RegExp; reason: string }[] = [
  { re: /\bnear me\b/i, reason: "navigational" },
  { re: /\bdmv\b/i, reason: "government" },
  { re: /\b(login|log in|sign in|sign up|signup)\b/i, reason: "navigational" },
  { re: /\bweather\b/i, reason: "navigational" },
  { re: /\bwikipedia\b/i, reason: "navigational" },
  { re: /\b(youtube|facebook|instagram|tiktok|google|amazon|walmart|netflix)\b/i, reason: "brand navigational" },
  { re: /\bcar registration\b/i, reason: "government" },
  { re: /\bsummer camp\b/i, reason: "consumer navigational" },
  { re: /\bregister for\b/i, reason: "navigational" },
  { re: /\b(lyrics|scoreboard)\b/i, reason: "entertainment" },
  { re: /\b(irs|tax form|passport renewal)\b/i, reason: "government" },
];

export function filterTrendNoise(keyword: string): { keep: boolean; reason: string | null } {
  const cleaned = keyword.trim();
  if (cleaned.length < 3) return { keep: false, reason: "too short" };
  if (/^[^a-z0-9]+$/i.test(cleaned)) return { keep: false, reason: "not a keyword" };
  for (const rule of NOISE_RULES) {
    if (rule.re.test(cleaned)) return { keep: false, reason: rule.reason };
  }
  return { keep: true, reason: null };
}

/** 0–1. Rules only. A live LLM classifier can raise this later; it must not override a noise reject. */
export function commercialIntent(keyword: string): number {
  let score = 0.35;
  if (/\b(software|app|tool|platform|service|saas|booking|quote|pricing|invoice|crm|automation|management|scheduling)\b/i.test(keyword)) {
    score += 0.4;
  }
  if (/\b(for businesses|for contractors|for clinics|b2b)\b/i.test(keyword)) score += 0.15;
  if (/\b(what is|definition|movie|lyrics|celebrity)\b/i.test(keyword)) score -= 0.4;
  return Math.min(1, Math.max(0, score));
}

export type TrendCandidate = {
  keyword: string;
  volume: number;
  growthPct: number;
  category: string;
};

export function selectTrendCards(candidates: TrendCandidate[], limit = 24): TrendCandidate[] {
  return candidates
    .filter((item) => filterTrendNoise(item.keyword).keep && commercialIntent(item.keyword) >= 0.4)
    .sort((a, b) => b.growthPct * Math.log10(b.volume + 10) - a.growthPct * Math.log10(a.volume + 10))
    .slice(0, limit);
}

/**
 * Growth definition used everywhere we print a growth figure:
 * last 3 months of volume versus the same 3 months a year earlier.
 * Returns percent points (50 means +50%). Null if the prior window is 0.
 */
export function growthFromMonthlySeries(series: number[]): number | null {
  if (series.length < 15) return null;
  const recent = series.slice(-3).reduce((sum, n) => sum + n, 0);
  const prior = series.slice(-15, -12).reduce((sum, n) => sum + n, 0);
  if (prior <= 0) return null;
  return Math.round(((recent - prior) / prior) * 1000) / 10;
}

export const TREND_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "AU", label: "Australia" },
  { code: "UK", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
] as const;

export type TrendCountry = (typeof TREND_COUNTRIES)[number]["code"];
