import type { Metadata } from "next";
import Link from "next/link";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { canAccess, TREND_TEASER_LIMIT } from "@/lib/gating";
import { formatGrowth, formatVolume } from "@/lib/idea-view";
import { db } from "@/lib/db";
import { TREND_COUNTRIES } from "@/lib/trends";
import { SampleBadge } from "@/components/sample-badge";

export const metadata: Metadata = { title: "Trends" };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ country?: string; q?: string }> }) {
  const sp = await searchParams;
  const country = TREND_COUNTRIES.some((item) => item.code === sp.country) ? sp.country! : "US";
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const full = canAccess(plan, "trends.full");
  const q = sp.q?.trim();
  const trends = await db.trend.findMany({
    where: {
      country,
      commercial: true,
      ...(q ? { OR: [{ keyword: { contains: q, mode: "insensitive" } }, { explainer: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { growthPct: "desc" },
  });
  const visible = full ? trends : trends.slice(0, TREND_TEASER_LIMIT);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-5xl">Trends library</h1>
          <p className="mt-2 max-w-2xl text-muted">Nightly cards. Navigational and government queries are filtered out. Growth is last 3 months versus the same 3 months a year earlier.</p>
        </div>
        <Link href="/trends/research" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Research a seed term</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TREND_COUNTRIES.map((item) => (
          <Link key={item.code} href={`/trends?country=${item.code}`} className={`rounded-full px-3 py-1 text-sm ${item.code === country ? "bg-teal text-white" : "border border-line bg-card"}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <form className="mt-4 flex gap-2" method="get">
        <input type="hidden" name="country" value={country} />
        <input name="q" defaultValue={q} placeholder="Search keyword or description" className="flex-1 rounded-full border border-line bg-card px-4 py-2" />
        <button className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Search</button>
      </form>
      {!full ? <p className="mt-4 text-sm text-copper">Showing {TREND_TEASER_LIMIT} cards. The rest of the library is on Builder. <Link href="/pricing" className="underline">Pricing</Link></p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((trend) => (
          <article key={trend.id} className="rounded-3xl border border-line bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-2xl">{trend.keyword}</h2>
              <SampleBadge mode={trend.dataMode} />
            </div>
            <p className="num mt-2 text-sm">Volume {trend.volume == null ? "—" : formatVolume(trend.volume)} · Growth {trend.growthPct == null ? "—" : formatGrowth(trend.growthPct)} · {trend.category}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{trend.explainer}</p>
            <p className="mt-3 text-xs text-muted">
              <a className="underline" href={trend.sourceUrl}>{trend.sourceLabel}</a> · {trend.asOf}
            </p>
            <Link href={`/generate?trend=${encodeURIComponent(trend.keyword)}`} className="mt-3 inline-block text-sm font-semibold text-teal">Generate ideas from this</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
