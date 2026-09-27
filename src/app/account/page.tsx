import Link from "next/link";
import { redirect } from "next/navigation";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { planLabel, quotaFor, type Meter } from "@/lib/gating";
import { founderArchetype } from "@/lib/founder-fit";
import { readProfile } from "@/lib/profile";
import { meterUsed } from "@/lib/usage";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const plan = asPlan(user.plan);
  const meters: Meter[] = ["research", "advisor", "trendResearch", "generate", "alphabet"];
  const usage = await Promise.all(meters.map(async (meter) => ({ meter, used: await meterUsed(user.id, meter), quota: quotaFor(plan, meter) })));
  const saved = await db.savedIdea.findMany({ where: { userId: user.id }, include: { idea: true } });
  const profile = readProfile(user.founderProfile);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Account</h1>
      <p className="mt-2">{user.email}</p>
      <p className="mt-1">Plan: <strong>{planLabel(plan)}</strong> {user.billingInterval !== "NONE" ? `· ${user.billingInterval.toLowerCase()}` : ""}</p>
      {profile ? <p className="mt-1 text-sm">Archetype {founderArchetype(profile)}. <Link className="underline" href="/fit">Edit fit profile</Link></p> : <p className="mt-1 text-sm"><Link className="underline" href="/fit">Take the fit quiz</Link></p>}
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {usage.map((row) => (
          <li key={row.meter} className="rounded-2xl border border-line bg-card p-3 text-sm">
            <span>{meterLabel(row.meter)}</span>
            <span className="num float-right">{row.used}/{row.quota}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-serif text-3xl">Daily letter</h2>
      <form action="/api/account/email" method="post" className="mt-2 text-sm">
        <input type="hidden" name="optIn" value={user.emailOptIn ? "no" : "yes"} />
        <p>{user.emailOptIn ? "This address receives the daily letter." : "This address is unsubscribed."}</p>
        <button className="mt-2 rounded-full border border-line px-3 py-1.5" type="submit">{user.emailOptIn ? "Unsubscribe" : "Subscribe again"}</button>
      </form>
      <h2 className="mt-8 font-serif text-3xl">Community release</h2>
      <p className="mt-2 text-sm text-muted">Alphabet Demand, Idea Agent, and trends research stay on this account, then may be anonymised into the public review queue. The delay is set by an admin. <Link className="underline" href="/privacy">Read the privacy note</Link>.</p>
      {plan === "PRO" ? (
        <form action="/api/account/community" method="post" className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm">
          <input type="hidden" name="optOut" value={user.communityReleaseOptOut ? "no" : "yes"} />
          <p>{user.communityReleaseOptOut ? "Public release is off for your future runs." : "Public release is on. Runs that are already in the queue stay there."}</p>
          <button className="mt-3 rounded-full border border-line px-3 py-1.5" type="submit">{user.communityReleaseOptOut ? "Allow anonymised public release" : "Opt out of public release"}</button>
        </form>
      ) : (
        <p className="mt-2 text-sm">Opt-out is a Pro control. Builder and Free runs can still be anonymised after the delay.</p>
      )}
      <h2 className="mt-8 font-serif text-3xl">Saved ideas</h2>
      <ul className="mt-2 space-y-1">
        {saved.map((row) => <li key={row.ideaId}><Link className="underline" href={`/ideas/${row.idea.slug}`}>{row.idea.title}</Link></li>)}
        {saved.length === 0 ? <li className="text-sm text-muted">None yet.</li> : null}
      </ul>
      <p className="mt-6 text-sm"><a className="underline" href="/api/export/ideas">Download the idea CSV</a> (Builder and Pro).</p>
      {user.isAdmin ? <p className="mt-3"><Link className="font-semibold text-teal" href="/admin">Admin queue</Link></p> : null}
      <form action="/api/auth/logout" method="post" className="mt-8">
        <button className="text-sm underline" type="submit">Sign out</button>
      </form>
    </div>
  );
}

function meterLabel(meter: Meter): string {
  if (meter === "trendResearch") return "Trend research";
  if (meter === "alphabet") return "Alphabet Demand";
  if (meter === "generate") return "Generator";
  if (meter === "research") return "Idea Agent";
  return "Advisor";
}
