import { NextResponse } from "next/server";
import { advise, type AdvisorMode } from "@/lib/advisor";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { founderFit } from "@/lib/founder-fit";
import { canAccess } from "@/lib/gating";
import { toIdeaView } from "@/lib/idea-view";
import { completeText, llmConfigured } from "@/lib/llm";
import { readProfile } from "@/lib/profile";
import type { ResearchReport } from "@/lib/research";
import { consumeMeter } from "@/lib/usage";
import type { IdeaRequirements } from "@/lib/founder-fit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "advisor")) return NextResponse.json({ error: "Advisor starts on Builder." }, { status: 403 });
  const body = (await request.json()) as { ideaId?: string; projectId?: string; reportId?: string; mode?: AdvisorMode; question?: string };
  const mode: AdvisorMode = body.mode === "roast" || body.mode === "next" ? body.mode : "ask";
  const question = (body.question || "").slice(0, 2000);
  const gate = await consumeMeter(user.id, plan, "advisor");
  if (!gate.ok) return NextResponse.json({ error: "Monthly advisor quota is used." }, { status: 402 });

  const context = await loadContext(body.ideaId, body.projectId, body.reportId, user.id);
  if (!context) return NextResponse.json({ error: "Nothing to advise on." }, { status: 404 });
  const profile = readProfile(user.founderProfile);
  const fit = profile && context.requirements ? founderFit(profile, context.requirements) : null;
  const grounded = advise(mode, question, { ...context.advisor, fit });

  let content = grounded.content;
  let dataMode = grounded.dataMode;
  if (llmConfigured()) {
    const llm = await completeText(
      "You are a startup advisor. Use only the JSON context. If dataMode is SAMPLE, say the figures are sample data and do not treat them as measurements. Do not add statistics, quotes, or company claims that are not in the context. For roast mode, end with Build, Pivot, or Skip.",
      JSON.stringify({ mode, question, context: context.advisor, fit }),
    );
    if (llm.ok) content = llm.text;
  }

  await db.advisorMessage.create({
    data: { userId: user.id, ideaId: body.ideaId, projectId: body.projectId, reportId: body.reportId, mode, role: "assistant", content, dataMode },
  });
  return NextResponse.json({ content, dataMode, remaining: gate.remaining });
}

async function loadContext(ideaId?: string, projectId?: string, reportId?: string, userId?: string) {
  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId }, include: { idea: true } });
    if (!project) return null;
    if (project.idea) return fromIdea(project.idea);
  }
  if (ideaId) {
    const idea = await db.idea.findUnique({ where: { id: ideaId } });
    if (idea) return fromIdea(idea);
  }
  if (reportId) {
    const report = await db.researchReport.findFirst({ where: { id: reportId, userId } });
    if (!report?.report) return null;
    const body = report.report as ResearchReport;
    return {
      requirements: null,
      advisor: {
        title: report.title,
        pitch: body.demand.summary,
        keyword: report.title,
        scores: body.scores,
        whyNow: body.sizing.bottomUp,
        proof: body.pains.map((pain) => pain.text).join(" "),
        marketGap: body.competitors.map((row) => row.note).join(" "),
        executionPlan: body.execution,
        offerSummary: body.pivots.join(" "),
        dataMode: body.dataMode,
      },
    };
  }
  return null;
}

function fromIdea(idea: NonNullable<Awaited<ReturnType<typeof db.idea.findUnique>>>) {
  const view = toIdeaView(idea);
  return {
    requirements: view.requirements as IdeaRequirements,
    advisor: {
      title: view.title,
      pitch: view.pitch,
      keyword: view.keyword,
      scores: {
        opportunity: view.scores.opportunity.value,
        pain: view.scores.pain.value,
        buildability: view.scores.buildability.value,
        timing: view.scores.timing.value,
      },
      whyNow: view.whyNow,
      proof: view.proof,
      marketGap: view.marketGap,
      executionPlan: view.executionPlan,
      offerSummary: view.offerLadder.map((tier) => `${tier.tier}: ${tier.price} — ${tier.detail}`).join(" "),
      dataMode: view.dataMode,
    },
  };
}
