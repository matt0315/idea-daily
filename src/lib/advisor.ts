import type { FitResult } from "./founder-fit";
import { roastVerdict, verdictConfidence, type ComputedScores } from "./scoring";

export type AdvisorMode = "ask" | "roast" | "next";

export type AdvisorContext = {
  title: string;
  pitch: string;
  keyword: string;
  scores: Pick<ComputedScores, "opportunity" | "pain" | "buildability" | "timing">;
  whyNow: string;
  proof: string;
  marketGap: string;
  executionPlan: string;
  offerSummary: string;
  fit?: FitResult | null;
  dataMode: "SAMPLE" | "LIVE";
};

function plain(text: string): string {
  return text.replace(/\{\{s\d+\}\}/g, "").replace(/\s+/g, " ").trim();
}

export function advise(mode: AdvisorMode, question: string, ctx: AdvisorContext): { content: string; dataMode: "SAMPLE" | "LIVE" } {
  const pitch = plain(ctx.pitch);
  const proof = plain(ctx.proof);
  const marketGap = plain(ctx.marketGap);
  const executionPlan = plain(ctx.executionPlan);
  const whyNow = plain(ctx.whyNow);
  const scoreLine = `Opportunity ${ctx.scores.opportunity}/10, pain ${ctx.scores.pain}/10, buildability ${ctx.scores.buildability}/10, timing ${ctx.scores.timing}/10.`;
  const sampleLine = ctx.dataMode === "SAMPLE" ? "These scores sit on sample inputs. Do not repeat the figures as measured facts." : "Scores use the stored inputs for this record.";

  if (mode === "roast") {
    const verdict = roastVerdict(ctx.scores);
    const confidence = verdictConfidence(ctx.scores);
    const reasons = [
      `Pain is ${ctx.scores.pain}/10. ${proof.slice(0, 220)}`,
      `The gap on file: ${marketGap.slice(0, 220)}`,
      `Buildability is ${ctx.scores.buildability}/10, so the first week should stay inside this plan: ${executionPlan.slice(0, 180)}`,
    ];
    return {
      dataMode: ctx.dataMode,
      content: [
        `Roast of ${ctx.title}: **${verdict}** (${confidence}% confidence on the stored scores, not on the market).`,
        sampleLine,
        scoreLine,
        ...reasons.map((reason, index) => `${index + 1}. ${reason}`),
        ctx.fit ? `Founder fit on the saved profile is ${ctx.fit.percent}% (${ctx.fit.label}). ${ctx.fit.changes[0]}` : "No founder profile is attached, so this roast ignores personal fit.",
      ].join("\n\n"),
    };
  }

  if (mode === "next") {
    const first = executionPlan.split(/(?<=\.)\s/)[0] || executionPlan;
    return {
      dataMode: ctx.dataMode,
      content: `Next step for ${ctx.title}: ${first}\n\nDo that before you open a code editor. ${sampleLine}`,
    };
  }

  const q = question.toLowerCase();
  let body: string;
  if (/price|offer|charge|cost/.test(q)) {
    body = `Offer on file for ${ctx.title}: ${ctx.offerSummary}`;
  } else if (/compet|gap|who else/.test(q)) {
    body = `Market gap on file: ${marketGap}`;
  } else if (/when|timing|why now/.test(q)) {
    body = `Why now, as stored: ${whyNow}`;
  } else if (/build|mvp|ship|stack/.test(q)) {
    body = `Execution plan on file: ${executionPlan}`;
  } else if (/fit|me|profile/.test(q) && ctx.fit) {
    body = `Founder fit is ${ctx.fit.percent}% (${ctx.fit.label}). ${ctx.fit.reasons.map((reason) => reason.text).slice(0, 3).join(" ")}`;
  } else {
    body = `${ctx.title} is about ${ctx.keyword}. ${pitch.slice(0, 500)}`;
  }

  return {
    dataMode: ctx.dataMode,
    content: `${body}\n\n${scoreLine} ${sampleLine}`,
  };
}
