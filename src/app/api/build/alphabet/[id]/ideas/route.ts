import { Prisma } from "@prisma/client";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { asGroups, clusterFromUnknown, draftIdeas, readDrafts } from "@/lib/autocomplete/mine";
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
  const productType = String(form.get("productType") || "saas");
  const cache = await db.autocompleteCache.findUnique({
    where: { niche_country_language: { niche: mine.niche, country: mine.country, language: mine.language } },
  });
  const draftKey = `${cluster.id}|${productType}`;
  const stored = cache && cache.drafts && typeof cache.drafts === "object" ? (cache.drafts as Record<string, unknown>)[draftKey] : null;
  const cachedIdeas = readDrafts(stored);
  const ideas = cachedIdeas.length > 0 ? cachedIdeas : (await draftIdeas(mine.niche, cluster, productType)).ideas;
  if (cache && cachedIdeas.length === 0) {
    const nextDrafts = { ...(typeof cache.drafts === "object" && cache.drafts ? cache.drafts : {}), [draftKey]: ideas };
    await db.autocompleteCache.update({
      where: { id: cache.id },
      data: { drafts: nextDrafts as Prisma.InputJsonValue },
    });
  }
  await db.autocompleteMine.update({
    where: { id: mine.id },
    data: { ideas: ideas as unknown as Prisma.InputJsonValue },
  });
  return redirectTo(request, `/build/alphabet/${mine.id}`);
}
