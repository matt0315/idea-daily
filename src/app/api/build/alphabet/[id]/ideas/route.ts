import { Prisma } from "@prisma/client";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { asGroups, clusterFromUnknown, draftIdeas } from "@/lib/autocomplete/mine";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/build/alphabet");
  if (!canAccess(asPlan(user.plan), "alphabet")) return redirectTo(request, "/pricing");
  const mine = await db.autocompleteMine.findFirst({ where: { id, userId: user.id } });
  if (!mine) return redirectTo(request, "/build/alphabet");
  const form = await request.formData();
  const cluster = clusterFromUnknown(asGroups(mine.groups), String(form.get("clusterId") || ""));
  if (!cluster) return redirectTo(request, `/build/alphabet/${mine.id}`);
  const drafted = await draftIdeas(mine.niche, cluster, String(form.get("productType") || "saas"));
  await db.autocompleteMine.update({
    where: { id: mine.id },
    data: { ideas: drafted.ideas as unknown as Prisma.InputJsonValue },
  });
  return redirectTo(request, `/build/alphabet/${mine.id}`);
}
