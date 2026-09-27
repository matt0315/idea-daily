import type { Metadata } from "next";
import Link from "next/link";
import { SampleBadge } from "@/components/sample-badge";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, INSIGHT_TEASER_LIMIT } from "@/lib/gating";

export const metadata: Metadata = { title: "Market insights" };

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const full = canAccess(asPlan(user?.plan ?? "FREE"), "insights.full");
  const insights = await db.insight.findMany({ orderBy: { audience: "asc" } });
  const visible = full ? insights : insights.slice(0, INSIGHT_TEASER_LIMIT);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl">Market insights</h1>
      <p className="mt-2 text-muted">A persona, the phrases they use, and pain notes. Quotes that are not sourced are labelled illustrative composites.</p>
      {!full ? <p className="mt-4 text-sm text-copper">One audience is free. The library is on Builder.</p> : null}
      <div className="mt-6 space-y-4">
        {visible.map((insight) => {
          const pains = insight.pains as { text: string; url: string; label: string; sample: boolean }[];
          const phrases = insight.phrases as string[];
          const badges = insight.badges as { label: string; value: string }[];
          return (
            <article key={insight.id} id={insight.slug} className="rounded-3xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-3xl">{insight.audience}</h2>
                <SampleBadge mode={insight.dataMode} />
              </div>
              <p className="mt-3 leading-7">{insight.persona}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span key={badge.label} className="rounded-full bg-paper px-3 py-1 text-xs">{badge.label}: {badge.value}</span>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {pains.map((pain) => (
                  <li key={pain.text} className="rounded-2xl bg-paper p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">{pain.label}</span>
                    <p className="mt-1">{pain.text}</p>
                    <a className="underline" href={pain.url}>Source</a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">Phrases: {phrases.join(" · ")}</p>
              <Link href={`/generate?trend=${encodeURIComponent(insight.audience)}`} className="mt-3 inline-block text-sm font-semibold text-teal">Generate ideas from this</Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
