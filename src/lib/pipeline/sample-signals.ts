import type { Signal } from "./cluster";

/** Clearly fake headlines used only when a source cannot be reached. */
export function sampleSignals(now = new Date().toISOString()): Signal[] {
  const row = (
    source: Signal["source"],
    title: string,
    text: string,
    score: number,
  ): Signal => ({
    source,
    title,
    url: "https://example.com/ideadaily-sample-signal",
    text,
    score,
    capturedAt: now,
    sample: true,
  });

  return [
    row("hackernews", "Electricians still quote panel upgrades from a blurry text photo", "quoting software electricians price book deposit", 82),
    row("web_search", "Small electrical shops want a faster way to send a deposit quote", "electrician quote photo price book", 70),
    row("producthunt", "Another generic AI writer for social posts", "ai social caption writer", 20),
    row("youtube", "Night audit on paper at a 20-room hotel", "boutique hotel night audit checklist", 64),
    row("apple_rss", "Farm box members forget to pause a CSA delivery", "csa subscription pause packing list farm", 58),
    row("dataforseo", "contractor permit status alerts", "permit tracking for small contractors", 60),
    row("hackernews", "Show HN: shared loading dock calendar for a multi-tenant warehouse", "warehouse dock appointment shared tenants", 75),
    row("web_search", "Music teachers lose the hour when a student no-shows", "music teacher deposit no-show booking", 55),
    row("youtube", "Register for YMCA summer camp", "navigational camp registration", 40),
    row("dataforseo", "CA DMV car registration", "government navigational query", 30),
  ];
}
