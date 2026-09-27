import type { Metadata } from "next";
import Link from "next/link";
import { FitQuiz } from "@/components/fit-quiz";
import { FocusPanel } from "@/components/focus-panel";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { founderArchetype, founderFit } from "@/lib/founder-fit";
import { readFocusChecklist } from "@/lib/focus";
import { canAccess } from "@/lib/gating";
import { readProfile } from "@/lib/profile";
import { db } from "@/lib/db";
import type { IdeaRequirements } from "@/lib/founder-fit";

export const metadata: Metadata = { title: "Founder fit" };

export default async function FitPage({ searchParams }: { searchParams: Promise<{ saved?: string; focus?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const profile = readProfile(user?.founderProfile);
  const allowed = canAccess(plan, "founderFit");
  const drafts = user
    ? await db.focusDraft.findMany({ where: { userId: user.id }, orderBy: [{ score: "desc" }, { updatedAt: "desc" }] })
    : [];
  const compared = drafts
    .map((draft) => ({ draft, checklist: readFocusChecklist(draft.checklist) }))
    .filter((row): row is { draft: (typeof drafts)[number]; checklist: NonNullable<ReturnType<typeof readFocusChecklist>> } => Boolean(row.checklist));
  const pick = compared[0];
  const ideas = profile && allowed
    ? await db.idea.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } })
    : [];
  const ranked = ideas
    .map((idea) => ({ idea, fit: founderFit(profile!, idea.requirements as IdeaRequirements) }))
    .sort((a, b) => b.fit.percent - a.fit.percent);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Founder fit</h1>
      <p className="mt-3 text-muted">A short quiz sets skills, hours, capital, and market preference. Each idea then gets a deterministic match. No model call is required to explain the percentage.</p>
      {sp.saved ? <p className="mt-3 text-sm text-teal">Profile saved.</p> : null}
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/fit">Sign in to save a profile</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-sm text-copper">You can fill the quiz now. Match percentages show on Builder.</p> : null}
      {profile ? <p className="mt-4 text-sm">Archetype: <strong>{founderArchetype(profile)}</strong></p> : null}
      <div className="mt-6"><FitQuiz initial={profile} /></div>
      <section className="mt-12" id="focus-four">
        <h2 className="font-serif text-4xl">{brand.focusName}</h2>
        <p className="mt-2 max-w-2xl text-muted">Run your own ideas through the same four checks. Keep up to four at once and compare them side by side. The highest score is the one to hold for the next 90 days.</p>
        {sp.focus === "full" ? <p className="mt-3 text-sm text-copper">Four ideas are already on the bench. Remove one before adding another.</p> : null}
        {sp.focus === "missing" ? <p className="mt-3 text-sm text-copper">Add a title, a customer, and an offer.</p> : null}
        {sp.focus === "saved" ? <p className="mt-3 text-sm text-teal">Idea scored.</p> : null}
        {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/fit">Sign in to compare your own ideas</Link></p> : null}
        {user ? (
          <form action="/api/fit/focus" method="post" className="mt-4 grid gap-3 rounded-3xl border border-line bg-card p-4 md:grid-cols-2">
            <input name="title" required placeholder="Working title" className="rounded-xl border border-line bg-paper px-3 py-2 md:col-span-2" />
            <input name="customer" required placeholder="One person, with a role and a place" className="rounded-xl border border-line bg-paper px-3 py-2" />
            <input name="pain" required placeholder="The pain you could repeat back" className="rounded-xl border border-line bg-paper px-3 py-2" />
            <input name="offer" required placeholder="The one thing they buy" className="rounded-xl border border-line bg-paper px-3 py-2" />
            <input name="price" required placeholder="One price" className="rounded-xl border border-line bg-paper px-3 py-2" />
            <textarea name="funnel" required placeholder={"Steps, one per line\nThey see…\nThey try…\nThey pay…"} className="min-h-28 rounded-xl border border-line bg-paper px-3 py-2 md:col-span-2" />
            <input name="channel" required placeholder="One place they already gather" className="rounded-xl border border-line bg-paper px-3 py-2 md:col-span-2" />
            <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper md:col-span-2 md:w-fit" type="submit">Score this idea</button>
          </form>
        ) : null}
        {pick ? <p className="mt-6 text-lg">For the next 90 days, start with <strong>{pick.draft.title}</strong>. It clears {pick.checklist.passedCount} of 4.</p> : null}
        {compared.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {compared.map(({ draft, checklist }) => (
              <div key={draft.id} className="rounded-3xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-2xl">{draft.title}</h3>
                  <form action="/api/fit/focus" method="post">
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="id" value={draft.id} />
                    <button className="text-sm underline" type="submit">Remove</button>
                  </form>
                </div>
                <FocusPanel checklist={checklist} />
              </div>
            ))}
          </div>
        ) : null}
      </section>
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
