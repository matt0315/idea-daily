import { selectTrendCards, type TrendCandidate } from "../lib/trends";

const BASE: TrendCandidate[] = [
  { keyword: "electrician quote software", volume: 14000, growthPct: 55, category: "Trades" },
  { keyword: "warehouse dock scheduling", volume: 6200, growthPct: 28, category: "Operations" },
  { keyword: "vet clinic shift handoff software", volume: 4100, growthPct: 22, category: "Clinics" },
  { keyword: "restaurant recipe costing software", volume: 9800, growthPct: 18, category: "Hospitality" },
  { keyword: "contractor permit tracking software", volume: 7300, growthPct: 36, category: "Trades" },
  { keyword: "csa subscription software", volume: 5400, growthPct: 15, category: "Food" },
  { keyword: "music teacher scheduling deposits", volume: 8800, growthPct: 12, category: "Education" },
  { keyword: "hotel night audit software", volume: 7600, growthPct: 20, category: "Hospitality" },
  { keyword: "lab sample intake software", volume: 2600, growthPct: 31, category: "Labs" },
  { keyword: "boutique hotel operations software", volume: 1900, growthPct: 24, category: "Hospitality" },
  { keyword: "CA DMV car registration", volume: 500000, growthPct: 20, category: "Noise" },
  { keyword: "register for ymca summer camp", volume: 2900, growthPct: 400, category: "Noise" },
  { keyword: "plumber near me", volume: 200000, growthPct: 10, category: "Noise" },
];

const COUNTRY_SCALE: Record<string, number> = { US: 1, AU: 0.32, UK: 0.48, CA: 0.41 };

export function seedTrends() {
  const kept = selectTrendCards(BASE, 20);
  const rows = [];
  for (const country of ["US", "AU", "UK", "CA"]) {
    const scale = COUNTRY_SCALE[country];
    for (const card of kept) {
      const volume = Math.max(50, Math.round(card.volume * scale));
      const series = Array.from({ length: 18 }, (_, index) => Math.round(volume * (0.7 + index * 0.018)));
      rows.push({
        keyword: card.keyword,
        country,
        category: card.category,
        volume,
        growthPct: card.growthPct,
        series,
        explainer: `Sample card for “${card.keyword}” in ${country}. The phrase passed the noise filter (navigational, government, and brand queries are dropped). Volume is a scaled placeholder, not a keyword-provider measurement. Growth uses the library definition: last 3 months versus the same 3 months a year earlier, and on this card the figure is the sample prior.`,
        sourceLabel: "IdeaDaily sample library",
        sourceUrl: "/methodology#trends",
        asOf: "2026-09-26",
        dataMode: "SAMPLE" as const,
        commercial: true,
      });
    }
  }
  return { rows, dropped: BASE.length - kept.length };
}

export function seedInsights() {
  return [
    {
      slug: "residential-electricians",
      audience: "Residential electrical shop owners",
      country: "US",
      persona:
        "Owns the tools and the schedule. Prices jobs at night. Will not adopt a tool that needs a dispatcher, a trainer, and a second login. Buys when a quote they already send gets faster.",
      pains: [
        {
          text: "Illustrative composite, not a real post: the quote happens after the kids are in bed, from a photo, and the number is a guess.",
          url: "/methodology#quotes",
          label: "Illustrative composite",
          sample: true,
        },
        {
          text: "Illustrative composite: a lead who does not get a number the same evening calls the next shop on the list.",
          url: "/methodology#quotes",
          label: "Illustrative composite",
          sample: true,
        },
      ],
      phrases: ["panel upgrade quote", "price book", "service call minimum", "EV charger install price"],
      badges: [
        { label: "Pain notes", value: "2 illustrative" },
        { label: "Sourced quotes", value: "0" },
        { label: "Communities linked", value: "1 public forum" },
        { label: "Revenue claim", value: "None" },
      ],
    },
    {
      slug: "boutique-night-audit",
      audience: "Night managers at hotels under 40 rooms",
      country: "US",
      persona: "Closes the day alone. The property system is the books. The useful artifact is the list of things that did not match.",
      pains: [
        {
          text: "Illustrative composite: the morning manager asks what was left open, and the answer is a verbal list.",
          url: "/methodology#quotes",
          label: "Illustrative composite",
          sample: true,
        },
      ],
      phrases: ["night audit", "out of balance", "no show deposit", "incident log"],
      badges: [
        { label: "Pain notes", value: "1 illustrative" },
        { label: "Sourced quotes", value: "0" },
        { label: "Communities linked", value: "0" },
        { label: "Revenue claim", value: "None" },
      ],
    },
    {
      slug: "csa-farms",
      audience: "Small CSA farms",
      country: "US",
      persona: "Packs one morning a week. Members pause in email, texts, and at the market stall. The list has to lock before the crates start.",
      pains: [
        {
          text: "Illustrative composite: a pause that arrives during packing is how a box goes to the wrong porch.",
          url: "/methodology#quotes",
          label: "Illustrative composite",
          sample: true,
        },
      ],
      phrases: ["box share", "skip this week", "packing list", "pickup site"],
      badges: [
        { label: "Pain notes", value: "1 illustrative" },
        { label: "Sourced quotes", value: "0" },
        { label: "Primary source", value: "USDA CSA page" },
        { label: "Revenue claim", value: "None" },
      ],
    },
  ];
}
