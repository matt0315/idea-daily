import type { SuggestionHit } from "./cluster";

/**
 * Synthetic phrases so the miner runs with no API key.
 * They are templates, not captured autocomplete results.
 */
export function sampleSuggestionsForNiche(niche: string): SuggestionHit[] {
  const n = niche.trim().replace(/\s+/g, " ") || "this niche";
  const lines: { text: string; query: string }[] = [
    { text: `how to send a ${n} quote from a photo`, query: `how ${n}` },
    { text: `how to send a ${n} quote the same day`, query: `how ${n}` },
    { text: `what should a ${n} include in a quote`, query: `${n} w` },
    { text: `why ${n} appointments run late`, query: `why ${n}` },
    { text: `why ${n} no show problem after hours`, query: `why ${n}` },
    { text: `${n} no show problem`, query: `${n} n` },
    { text: `${n} no show problem on mondays`, query: `${n} n` },
    { text: `best ${n} checklist for site photos`, query: `best ${n}` },
    { text: `best ${n} checklist for panel photos`, query: `best ${n}` },
    { text: `${n} invoice tracker spreadsheet`, query: `${n} i` },
    { text: `${n} invoice tracker for deposits`, query: `${n} i` },
    { text: `can a ${n} automate reminders`, query: `can ${n}` },
    { text: `${n} client intake template`, query: `${n} c` },
    { text: `${n} pricing template for small jobs`, query: `${n} p` },
  ];
  return lines.map((line) => ({ text: line.text, query: line.query }));
}
