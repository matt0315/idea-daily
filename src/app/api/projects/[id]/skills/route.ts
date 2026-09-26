import { Prisma } from "@prisma/client";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { briefFromUnknown, type BuildBrief } from "@/lib/build-guides";
import { db } from "@/lib/db";
import { founderArchetype } from "@/lib/founder-fit";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { readProfile } from "@/lib/profile";
import { runSkill, type SkillId, SKILLS } from "@/lib/skills";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/build");
  if (!canAccess(asPlan(user.plan), "buildHub")) return redirectTo(request, "/pricing");
  const project = await db.project.findFirst({ where: { id, userId: user.id }, include: { idea: true } });
  if (!project) return redirectTo(request, "/build");
  const form = await request.formData();
  const skill = String(form.get("skill") || "") as SkillId;
  if (!SKILLS.some((item) => item.id === skill)) return redirectTo(request, `/build/${id}`);
  const profile = readProfile(user.founderProfile);
  const brief: BuildBrief = project.idea
    ? briefFromUnknown(project.idea.buildBrief, project.idea.title)
    : {
        title: project.title,
        slug: "project",
        oneLiner: project.title,
        customer: "The customer named in the project.",
        problem: "The chore described when the project was created.",
        mvp: ["One artifact", "A way to send it", "A price set after interviews"],
        stack: "Next.js, Postgres",
        pricing: "Set after interviews.",
        outOfScope: ["A marketplace"],
      };
  const result = runSkill(skill, {
    brief,
    founderName: user.name || undefined,
    archetype: profile ? founderArchetype(profile) : undefined,
    weeklyHours: profile?.weeklyHours,
  });
  const outputs = { ...(project.outputs as Record<string, unknown>) };
  const stamp = new Date().toISOString();
  if (skill === "run-all") {
    for (const idOfSkill of result.skills) {
      if (idOfSkill === "run-all") outputs["run-all"] = { markdown: result.markdown, createdAt: stamp };
    }
    const chunks = result.markdown.split("\n\n---\n\n");
    const order = ["offer", "voice", "landing", "email", "ship"] as const;
    order.forEach((name, index) => {
      if (chunks[index]) outputs[name] = { markdown: chunks[index], createdAt: stamp };
    });
  } else {
    outputs[skill] = { markdown: result.markdown, createdAt: stamp };
  }
  await db.project.update({ where: { id }, data: { outputs: outputs as Prisma.InputJsonValue } });
  return redirectTo(request, `/build/${id}`);
}
