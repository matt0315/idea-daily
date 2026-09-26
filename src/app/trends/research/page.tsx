import type { Metadata } from "next";
import Link from "next/link";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, quotaFor } from "@/lib/gating";
import { meterUsed } from "@/lib/usage";
import { TREND_COUNTRIES } from "@/lib/trends";

export const metadata: Metadata = { title: "Trends research" };

export default async function TrendResearchPage() {
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const allowed = canAccess(plan, "trends.research");
  const used = user ? await meterUsed(user.id, "trendResearch") : 0;
  const queries = user ? await db.trendQuery.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Trends research</h1>
      <p className="mt-3 text-muted">Enter a seed term and a country. Related phrases are ranked by commercial intent. Volume stays blank until a keyword provider is connected, and the page says so.</p>
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login">Sign in</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-copper">This query is metered on Builder ({quotaFor("BUILDER", "trendResearch")}/month) and Pro ({quotaFor("PRO", "trendResearch")}/month).</p> : null}
      {user && allowed ? <p className="mt-4 text-sm text-muted">{used} of {quotaFor(plan, "trendResearch")} used this month.</p> : null}
      <form action="/api/trends/research" method="post" className="mt-6 space-y-3 rounded-3xl border border-line bg-card p-5">
        <input name="seed" required placeholder="Seed term, e.g. clinic handoff" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <select name="country" className="w-full rounded-xl border border-line bg-paper px-3 py-2">
          {TREND_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
        </select>
        <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit" disabled={!allowed}>Run research</button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {queries.map((query) => (
          <li key={query.id}><Link className="underline" href={`/trends/research/${query.id}`}>{query.seed} · {query.country}</Link></li>
        ))}
      </ul>
    </div>
  );
}
