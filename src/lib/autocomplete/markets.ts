export const AUTOCOMPLETE_MARKETS = [
  { code: "US", label: "United States", locationCode: 2840, gl: "us" },
  { code: "AU", label: "Australia", locationCode: 2036, gl: "au" },
  { code: "UK", label: "United Kingdom", locationCode: 2826, gl: "gb" },
  { code: "CA", label: "Canada", locationCode: 2124, gl: "ca" },
] as const;

export type MarketCode = (typeof AUTOCOMPLETE_MARKETS)[number]["code"];

export const AUTOCOMPLETE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
] as const;

export type LanguageCode = (typeof AUTOCOMPLETE_LANGUAGES)[number]["code"];

export function marketByCode(code: string) {
  return AUTOCOMPLETE_MARKETS.find((market) => market.code === code.toUpperCase()) ?? AUTOCOMPLETE_MARKETS[0];
}

export function normalizeCountry(code: string): MarketCode {
  return marketByCode(code).code;
}

export function normalizeLanguage(code: string): LanguageCode {
  const found = AUTOCOMPLETE_LANGUAGES.find((language) => language.code === code.toLowerCase());
  return found?.code ?? "en";
}

export function normalizeNiche(niche: string): string {
  return niche.trim().replace(/\s+/g, " ").slice(0, 80);
}
