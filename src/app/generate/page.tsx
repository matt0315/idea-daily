import type { Metadata } from "next";
import Link from "next/link";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, quotaFor } from "@/lib/gating";
import { meterUsed } from "@/lib/usage";
import type { GeneratedCard } from "@/lib/generate";

export const metadata: Metadata = { title: "Generate ideas" };

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ trend?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const allowed = canAccess(plan, "generate");
  const used = user ? await meterUsed(user.id, "generate") : 0;
  const history = user ? await db.generatedIdea.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Generate ideas</h1>
      <p className="mt-3 text-muted">Three angles from your profile and an optional trend. They are drafts, marked sample, and they are not added to the public archive.</p>
      {user && allowed ? <p className="mt-3 text-sm">{used} of {quotaFor(plan, "generate")} this month.</p> : null}
      {!user ? <p className="mt-4"><Link href="/login?next=/generate" className="font-semibold text-teal">Sign in</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-copper">The generator is on Builder.</p> : null}
      <form action="/api/generate" method="post" className="mt-6 flex gap-2">
        <input name="trend" defaultValue={sp.trend || ""} placeholder="Optional seed or trend" className="flex-1 rounded-full border border-line bg-card px-4 py-2" />
        <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" disabled={!allowed} type="submit">Generate</button>
      </form>
      <div className="mt-8 space-y-4">
        {history.map((row) => {
          const cards = row.payload as GeneratedCard[];
          return (
            <section key={row.id} className="rounded-3xl border border-line bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-amber-800">Sample drafts</p>
              <div className="mt-3 grid gap-3">
                {cards.map((card) => (
                  <article key={card.title}>
                    <h2 className="font-serif text-2xl">{card.title}</h2>
                    <p className="text-sm">{card.summary}</p>
                    <p className="text-sm text-muted">{card.customer} · {card.wedge}</p>
                    <Link className="text-sm font-semibold text-teal" href={`/research?seed=${encodeURIComponent(card.summary)}`}>Send to Idea Agent</Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

