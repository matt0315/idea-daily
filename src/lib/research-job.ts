import { db } from "./db";
import { harvestWebSearch } from "./pipeline/harvest";
import { readProfile } from "./profile";
import { buildResearchReport, type ResearchInput } from "./research";

export async function executeResearch(reportId: string) {
  const existing = await db.researchReport.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!existing) return { ok: false as const };
  if (existing.status === "complete" && existing.report) return { ok: true as const, id: reportId };

  const input = existing.input as ResearchInput;
  const profile = readProfile(existing.user.founderProfile);
  const report = buildResearchReport(input, profile);

  const signals = await harvestWebSearch(`${input.description} ${input.customer} competitors`);
  const liveSignals = signals.filter((signal) => !signal.sample);
  if (liveSignals.length > 0) {
    report.competitors = liveSignals.slice(0, 8).map((signal) => ({
      name: signal.title,
      url: signal.url,
      note: "Search result. Positioning and price were not extracted automatically.",
      sample: false,
    }));
    report.sources.push({
      id: report.sources.length + 1,
      title: "Web search results",
      url: liveSignals[0].url,
      note: "Competitor rows are the result titles and URLs. They are not a claim about revenue or pricing.",
      sample: false,
    });
  }

  await db.researchReport.update({
    where: { id: reportId },
    data: {
      status: "complete",
      report,
      verdict: report.verdict,
      confidence: report.confidence,
      dataMode: report.dataMode,
      progress: ["keywords", "demand", "competition", "voice", "sizing", "verdict"],
    },
  });
  return { ok: true as const, id: reportId };
}
