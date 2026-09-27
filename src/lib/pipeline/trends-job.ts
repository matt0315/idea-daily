import type { PrismaClient } from "@prisma/client";
import { seedTrends } from "@/content/trends";
import { harvestSearchVolume } from "./harvest";

export async function refreshTrends(db: PrismaClient) {
  const { rows, dropped } = seedTrends();
  let live = 0;
  const volumes = await harvestSearchVolume(rows.filter((row) => row.country === "US").map((row) => row.keyword));
  const liveVolumes = new Map(
    volumes.filter((signal) => !signal.sample).map((signal) => {
      const match = signal.text.match(/volume\s+(\d+)/i);
      return [signal.title.toLowerCase(), match ? Number(match[1]) : null] as const;
    }),
  );

  for (const row of rows) {
    const measured = row.country === "US" ? liveVolumes.get(row.keyword.toLowerCase()) : null;
    const data = {
      ...row,
      volume: measured ?? row.volume,
      dataMode: measured ? "LIVE" as const : "SAMPLE" as const,
      sourceLabel: measured ? "DataForSEO Google Ads volume" : row.sourceLabel,
      sourceUrl: measured ? "https://dataforseo.com/" : row.sourceUrl,
      explainer: measured
        ? `Live monthly volume for “${row.keyword}” in ${row.country}. Growth on this card is still the sample prior unless a 15-month series was returned.`
        : row.explainer,
    };
    if (measured) live += 1;
    await db.trend.upsert({
      where: { keyword_country: { keyword: row.keyword, country: row.country } },
      create: data,
      update: data,
    });
  }

  await db.pipelineRun.create({
    data: {
      kind: "trends-refresh",
      status: "completed",
      dataMode: live > 0 ? "LIVE" : "SAMPLE",
      log: { cards: rows.length, droppedNoise: dropped, liveVolumes: live },
    },
  });

  return { cards: rows.length, dropped, live };
}
