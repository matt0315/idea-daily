import type { Metadata } from "next";
import Link from "next/link";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, quotaFor } from "@/lib/gating";
import { meterUsed } from "@/lib/usage";
import { CommunityNotice } from "@/components/community-notice";
import { TREND_COUNTRIES } from "@/lib/trends";

export const metadata: Metadata = { title: "Idea Agent" };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ seed?: string; customer?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const allowed = canAccess(plan, "research");
  const used = user ? await meterUsed(user.id, "research") : 0;
  const reports = user ? await db.researchReport.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Idea Agent</h1>
      <p className="mt-3 text-muted">Submit your own idea. The report covers demand, competitors, customer language, market sizing, and a Build, Test-first, or Pass verdict. Every figure is footnoted. Without a keyword provider, volume is left blank instead of invented. The same description and country, if researched recently, is reused from the shared cache and does not use a research credit.</p>
      <CommunityNotice />
      {user && allowed ? <p className="mt-3 text-sm">{used} of {quotaFor(plan, "research")} runs this month.</p> : null}
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/research">Sign in</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-copper">Research runs are on Pro ({quotaFor("PRO", "research")} per month).</p> : null}
      <form action="/api/research" method="post" className="mt-6 space-y-3 rounded-3xl border border-line bg-card p-5">
        <textarea name="description" required defaultValue={sp.seed || ""} placeholder="What is the idea?" rows={4} className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <input name="customer" required defaultValue={sp.customer || ""} placeholder="Who is the customer?" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <select name="country" className="w-full rounded-xl border border-line bg-paper px-3 py-2">
          {TREND_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
        </select>
        <input name="url" placeholder="Optional URL" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <button disabled={!allowed} className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">Run research</button>
      </form>
      <ul className="mt-8 space-y-2">
        {reports.map((report) => (
          <li key={report.id}>
            <Link href={`/research/${report.id}`} className="flex items-baseline justify-between rounded-2xl border border-line bg-card px-4 py-3">
              <span className="font-serif text-xl">{report.title}</span>
              <span className="text-sm text-muted">{report.verdict || report.status} · {report.dataMode === "SAMPLE" ? "Sample data" : "Live"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
