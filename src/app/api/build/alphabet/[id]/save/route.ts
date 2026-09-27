import { Prisma } from "@prisma/client";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { readDrafts } from "@/lib/autocomplete/ideas";
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
  const index = Number(form.get("index"));
  const drafts = readDrafts(mine.ideas);
  const draft = drafts[index];
  if (!draft) return redirectTo(request, `/build/alphabet/${mine.id}`);
  const intent = String(form.get("intent") || "project");

  if (intent === "agent") {
    const seed = `${draft.title}. ${draft.summary} Searches: ${draft.searches.join("; ")}`.slice(0, 500);
    const customer = `People searching “${mine.niche}”`;
    const params = new URLSearchParams({ seed, customer });
    return redirectTo(request, `/research?${params.toString()}`);
  }

  const project = await db.project.create({
    data: {
      userId: user.id,
      title: draft.title,
      context: {
        alphabetIdea: {
          title: draft.title,
          summary: draft.summary,
          searches: draft.searches,
          niche: mine.niche,
          productType: draft.productLabel,
          country: mine.country,
          dataMode: mine.dataMode,
          scores: draft.scores,
        },
      } as Prisma.InputJsonValue,
      outputs: {},
    },
  });
  const hash = intent === "advisor" ? "#advisor" : "";
  return redirectTo(request, `/build/${project.id}${hash}`);
}
