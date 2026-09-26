/** Letters, digits, and question prefixes appended to a niche seed. */
export const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
export const DIGITS = "0123456789".split("");
export const QUESTION_PREFIXES = ["how", "why", "best", "can"] as const;

export const QUERY_EXPANSION_COUNT = ALPHABET.length + DIGITS.length + QUESTION_PREFIXES.length;

function normalizeNiche(niche: string): string {
  return niche.trim().replace(/\s+/g, " ");
}

/**
 * Expands one niche into the queries an autocomplete miner sends.
 * Letter and digit queries are `${niche} ${suffix}`. Prefix queries are `${prefix} ${niche}`.
 */
export function expandSeedQueries(niche: string): string[] {
  const seed = normalizeNiche(niche);
  if (!seed) return [];
  return [
    ...ALPHABET.map((letter) => `${seed} ${letter}`),
    ...DIGITS.map((digit) => `${seed} ${digit}`),
    ...QUESTION_PREFIXES.map((prefix) => `${prefix} ${seed}`),
  ];
}
