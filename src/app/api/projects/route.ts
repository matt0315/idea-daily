import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/build");
  if (!canAccess(asPlan(user.plan), "buildHub")) return redirectTo(request, "/pricing");
  const form = await request.formData();
  const ideaId = String(form.get("ideaId") || "");
  const reportId = String(form.get("reportId") || "");
  let title = String(form.get("title") || "").trim();
  let linkedIdea: string | null = ideaId || null;
  if (reportId) {
    const report = await db.researchReport.findFirst({ where: { id: reportId, userId: user.id } });
    if (!report) return redirectTo(request, "/research");
    title = title || report.title;
    const project = await db.project.create({
      data: { userId: user.id, title, ideaId: linkedIdea, context: { reportId }, outputs: {} },
    });
    await db.researchReport.update({ where: { id: report.id }, data: { projectId: project.id } });
    return redirectTo(request, `/build/${project.id}`);
  }
  if (!title) {
    if (linkedIdea) {
      const idea = await db.idea.findUnique({ where: { id: linkedIdea } });
      title = idea ? `${idea.title} project` : "Untitled project";
      if (!idea) linkedIdea = null;
    } else title = "Untitled project";
  }
  const project = await db.project.create({
    data: { userId: user.id, title, ideaId: linkedIdea, context: {}, outputs: {} },
  });
  return redirectTo(request, `/build/${project.id}`);
}
