import type { Metadata } from "next";
import Link from "next/link";
import { FitQuiz } from "@/components/fit-quiz";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { founderArchetype, founderFit } from "@/lib/founder-fit";
import { canAccess } from "@/lib/gating";
import { readProfile } from "@/lib/profile";
import { db } from "@/lib/db";
import type { IdeaRequirements } from "@/lib/founder-fit";

export const metadata: Metadata = { title: "Founder fit" };

export default async function FitPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const profile = readProfile(user?.founderProfile);
  const allowed = canAccess(plan, "founderFit");
  const ideas = profile && allowed
    ? await db.idea.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } })
    : [];
  const ranked = ideas
    .map((idea) => ({ idea, fit: founderFit(profile!, idea.requirements as IdeaRequirements) }))
    .sort((a, b) => b.fit.percent - a.fit.percent);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Founder fit</h1>
      <p className="mt-3 text-muted">A short quiz sets skills, hours, capital, and market preference. Each idea then gets a deterministic match. No model call is required to explain the percentage.</p>
      {sp.saved ? <p className="mt-3 text-sm text-teal">Profile saved.</p> : null}
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/fit">Sign in to save a profile</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-sm text-copper">You can fill the quiz now. Match percentages show on Builder.</p> : null}
      {profile ? <p className="mt-4 text-sm">Archetype: <strong>{founderArchetype(profile)}</strong></p> : null}
      <div className="mt-6"><FitQuiz initial={profile} /></div>
      {ranked.length > 0 ? (
        <ol className="mt-8 space-y-2">
          {ranked.map(({ idea, fit }) => (
            <li key={idea.id}>
              <Link href={`/ideas/${idea.slug}`} className="flex items-baseline justify-between rounded-2xl border border-line bg-card px-4 py-3">
                <span className="font-serif text-xl">{idea.title}</span>
                <span className="num text-sm">{fit.percent}% · {fit.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
