import type { Metadata } from "next";
import Link from "next/link";
import { alphabetDemand } from "@/lib/autocomplete/copy";
import { AUTOCOMPLETE_LANGUAGES, AUTOCOMPLETE_MARKETS } from "@/lib/autocomplete/markets";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { BuildNav } from "@/components/build-nav";
import { db } from "@/lib/db";
import { canAccess, quotaFor, remaining } from "@/lib/gating";
import { meterUsed } from "@/lib/usage";

export const metadata: Metadata = { title: alphabetDemand.name };

export default async function AlphabetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const allowed = canAccess(plan, "alphabet");
  const used = user ? await meterUsed(user.id, "alphabet") : 0;
  const left = remaining(plan, "alphabet", used);
  const mines = user ? await db.autocompleteMine.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Build hub</h1>
      <BuildNav current="alphabet" />
      <h2 className="mt-6 font-serif text-4xl">{alphabetDemand.name}</h2>
      <p className="mt-3 text-muted">{alphabetDemand.blurb} A cached niche does not call the provider again for seven days, and it still counts as one mine. Opening a saved mine does not.</p>
      {user && allowed ? <p className="mt-3 text-sm">{used} of {quotaFor(plan, "alphabet")} mines used this month. {left} left.</p> : null}
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/build/alphabet">Sign in</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-copper">Alphabet Demand starts on Builder. Free accounts can still open public idea pages.</p> : null}
      {sp.error === "quota" ? <p className="mt-3 text-sm text-copper">This month’s mine quota is used.</p> : null}
      {sp.error === "niche" ? <p className="mt-3 text-sm text-copper">Enter a niche of at least two characters.</p> : null}
      {user && allowed ? (
        <form action="/api/build/alphabet" method="post" className="mt-6 space-y-3 rounded-3xl border border-line bg-card p-5">
          <label className="block text-sm">
            Niche
            <input name="niche" required minLength={2} maxLength={80} placeholder="residential electrician" className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Country
              <select name="country" defaultValue="US" className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2">
                {AUTOCOMPLETE_MARKETS.map((market) => <option key={market.code} value={market.code}>{market.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              Language
              <select name="language" defaultValue="en" className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2">
                {AUTOCOMPLETE_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
              </select>
            </label>
          </div>
          <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">Mine this niche</button>
          <p className="text-xs text-muted">A live pass sends 40 queries (a–z, 0–9, and how / why / best / can). With no provider key, you get labelled sample phrases.</p>
        </form>
      ) : null}
      <h3 className="mt-8 font-serif text-2xl">Saved mines</h3>
      <ul className="mt-3 space-y-2">
        {mines.map((mine) => (
          <li key={mine.id}>
            <Link href={`/build/alphabet/${mine.id}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
              <span className="font-serif text-2xl">{mine.niche}</span>
              <span className="mt-1 block text-sm text-muted">{mine.country} · {mine.language} · {mine.dataMode === "SAMPLE" ? "Sample data" : "Live"} · {mine.source}</span>
            </Link>
          </li>
        ))}
        {mines.length === 0 ? <li className="text-sm text-muted">None yet.</li> : null}
      </ul>
    </div>
  );
}
