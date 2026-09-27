import { notFound } from "next/navigation";
import { asPlan, getCurrentUser } from "./auth";
import { db } from "./db";
import { founderFit, type FitResult } from "./founder-fit";
import { canAccess } from "./gating";
import { toIdeaView, type IdeaView } from "./idea-view";
import { readProfile } from "./profile";

export async function loadPublishedIdea(slug: string): Promise<{
  idea: IdeaView;
  fit: FitResult | null;
  plan: ReturnType<typeof asPlan>;
  signedIn: boolean;
  advisorEnabled: boolean;
  galleryCount: number;
  userId: string | null;
}> {
  const row = await db.idea.findUnique({ where: { slug } });
  if (!row || row.status !== "PUBLISHED") notFound();
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const profile = readProfile(user?.founderProfile);
  const idea = toIdeaView(row);
  const fit = user && profile && canAccess(plan, "founderFit") ? founderFit(profile, idea.requirements) : null;
  const galleryCount = await db.galleryItem.count({ where: { ideaId: row.id, status: "approved" } });
  return {
    idea,
    fit,
    plan,
    signedIn: Boolean(user),
    advisorEnabled: Boolean(user) && canAccess(plan, "advisor"),
    galleryCount,
    userId: user?.id ?? null,
  };
}
