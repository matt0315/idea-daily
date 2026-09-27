import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateIdeaCards } from "@/lib/generate";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";
import { readProfile } from "@/lib/profile";
import { consumeMeter } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/generate");
  const plan = asPlan(user.plan);
  if (!canAccess(plan, "generate")) return redirectTo(request, "/pricing");
  const gate = await consumeMeter(user.id, plan, "generate");
  if (!gate.ok) return redirectTo(request, "/generate?quota=1");
  const form = await request.formData();
  const trend = String(form.get("trend") || "");
  const cards = generateIdeaCards(readProfile(user.founderProfile), trend);
  await db.generatedIdea.create({ data: { userId: user.id, payload: cards, trendId: trend || null } });
  return redirectTo(request, "/generate");
}
