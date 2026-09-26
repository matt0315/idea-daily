import Link from "next/link";
import { notFound } from "next/navigation";
import { alphabetDemand, ideaTypeLabel } from "@/lib/autocomplete/copy";
import type { GroupedSuggestions, SuggestionCluster } from "@/lib/autocomplete/cluster";
import { asGroups, readDrafts } from "@/lib/autocomplete/mine";
import { PRODUCT_TYPES } from "@/lib/autocomplete/ideas";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { BuildNav } from "@/components/build-nav";
import { SampleBadge } from "@/components/sample-badge";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";

export default async function AlphabetMinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const mine = await db.autocompleteMine.findFirst({ where: { id, userId: user.id } });
  if (!mine) notFound();
  const plan = asPlan(user.plan);
  const allowed = canAccess(plan, "alphabet");
  const groups = asGroups(mine.groups);
  const ideas = readDrafts(mine.ideas);
  const sections: { title: string; clusters: SuggestionCluster[] }[] = [
    { title: "Questions", clusters: groups.questions },
    { title: "Problems", clusters: groups.problems },
    { title: "Desires", clusters: groups.desires },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl">Build hub</h1>
      <BuildNav current="alphabet" />
      <p className="mt-6 text-xs uppercase tracking-wide text-teal">{alphabetDemand.name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-4xl">{mine.niche}</h2>
        <SampleBadge mode={mine.dataMode} />
      </div>
      <p className="mt-2 text-sm text-muted">{mine.country} · {mine.language} · {mine.source}{mine.cacheHit ? " · served from the 7-day cache" : ""}</p>
      {mine.dataMode === "SAMPLE" ? <p className="mt-2 max-w-2xl text-sm text-amber-950">These phrases are sample stand-ins. They were not returned by an autocomplete provider.</p> : null}
      {!allowed ? <p className="mt-3 text-sm text-copper">This mine is saved. New mines need Builder.</p> : null}

      <form action={`/api/build/alphabet/${mine.id}/ideas`} method="post" className="mt-6 space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-3xl border border-line bg-card p-4">
            <h3 className="font-serif text-2xl">{section.title} · {section.clusters.reduce((sum, cluster) => sum + cluster.count, 0)}</h3>
            <div className="mt-3 space-y-3">
              {section.clusters.length === 0 ? <p className="text-sm text-muted">No phrases in this group.</p> : null}
              {section.clusters.slice(0, 8).map((cluster) => (
                <label key={cluster.id} className="block rounded-2xl border border-line p-3">
                  <span className="flex items-start gap-2">
                    <input type="radio" name="clusterId" value={cluster.id} defaultChecked={cluster.id === firstClusterId(groups)} className="mt-1" />
                    <span>
                      <span className="font-semibold">{cluster.label}</span>
                      <span className="ml-2 text-sm text-muted">{cluster.count} searches{cluster.volume != null ? ` · volume ${cluster.volume}` : ""}</span>
                      <span className="mt-1 block text-sm text-muted">{cluster.suggestions.map((suggestion) => suggestion.text).join(" · ")}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Product type
            <select name="productType" defaultValue="checklist" className="mt-1 block rounded-xl border border-line bg-card px-3 py-2">
              {PRODUCT_TYPES.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}
            </select>
          </label>
          <button disabled={!allowed} className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">Draft about 10 ideas</button>
        </div>
        <p className="text-xs text-muted">Drafting does not use another mine. Each idea keeps the searches it was written from. A new draft replaces the list below.</p>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-3xl">Ideas</h3>
        <div className="flex gap-3 text-sm">
          <a className="underline" href={`/api/build/alphabet/${mine.id}/export?format=csv`}>CSV</a>
          <a className="underline" href={`/api/build/alphabet/${mine.id}/export?format=md`}>Markdown</a>
        </div>
      </div>
      <ul className="mt-4 space-y-4">
        {ideas.map((idea, index) => (
          <li key={`${idea.title}-${index}`} className="rounded-3xl border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{idea.productLabel} · {ideaTypeLabel(idea.ideaType)}</p>
            <h4 className="font-serif text-2xl">{idea.title}</h4>
            <p className="mt-2 text-sm">{idea.summary}</p>
            <p className="mt-2 text-sm text-muted">Searches: {idea.searches.join(" · ")}</p>
            <p className="mt-1 text-sm text-muted">Opportunity {idea.scores.opportunity} · Pain {idea.scores.pain} · Buildability {idea.scores.buildability} · Timing {idea.scores.timing}</p>
            <form action={`/api/build/alphabet/${mine.id}/save`} method="post" className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="index" value={index} />
              <button name="intent" value="project" className="rounded-full border border-line px-3 py-1 text-sm" type="submit">Save to project</button>
              <button name="intent" value="advisor" className="rounded-full border border-line px-3 py-1 text-sm" type="submit">Send to Advisor</button>
              <button name="intent" value="agent" className="rounded-full border border-line px-3 py-1 text-sm" type="submit">Send to Idea Agent</button>
            </form>
          </li>
        ))}
        {ideas.length === 0 ? <li className="text-sm text-muted">Pick a cluster and a product type to draft ideas.</li> : null}
      </ul>
      <p className="mt-6 text-sm"><Link className="underline" href="/build/alphabet">Mine another niche</Link></p>
    </div>
  );
}

function firstClusterId(groups: GroupedSuggestions): string {
  return groups.questions[0]?.id || groups.problems[0]?.id || groups.desires[0]?.id || "";
}
