import Link from "next/link";
import { FRAMEWORKS } from "@/lib/frameworks";
import { briefFromUnknown, guidesForBrief } from "@/lib/build-guides";
import { guideAllowed, type Plan } from "@/lib/gating";
import type { FitResult } from "@/lib/founder-fit";
import { ideaTypeLabel } from "@/lib/autocomplete/copy";
import { formatGrowth, formatVolume, type IdeaView } from "@/lib/idea-view";
import { AdvisorPanel } from "./advisor-panel";
import { BuildGuideTabs } from "./build-guides";
import { KeywordChart } from "./keyword-chart";
import { RichText, SourceList } from "./rich-text";
import { FocusPanel } from "./focus-panel";
import { SampleBadge } from "./sample-badge";

const FACETS = [
  ["opportunity", "Opportunity"],
  ["pain", "Pain"],
  ["buildability", "Buildability"],
  ["timing", "Timing"],
] as const;

export function IdeaReport({
  idea,
  fit,
  plan,
  signedIn,
  advisorEnabled,
  galleryCount,
}: {
  idea: IdeaView;
  fit: FitResult | null;
  plan: Plan;
  signedIn: boolean;
  advisorEnabled: boolean;
  galleryCount: number;
}) {
  const guides = guidesForBrief(briefFromUnknown(idea.buildBrief, idea.title)).map((guide) => ({
    ...guide,
    allowed: guideAllowed(plan, guide.tool),
  }));
  const date = idea.publishedAt
    ? idea.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : "Not published";

  return (
    <article className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{date} · {ideaTypeLabel(idea.ideaType)} · {idea.category} · {idea.market}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-5xl tracking-tight">{idea.title}</h1>
          <SampleBadge mode={idea.dataMode} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {idea.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal-dark">{tag}</span>
          ))}
        </div>

        <section className="mt-8" id="pitch">
          <RichText text={idea.pitch} sources={idea.sources} />
          <p className="mt-4 text-sm text-muted">Scores and revenue sketches are educational. Sample figures are not measurements. Read the footnotes before you repeat a number.</p>
        </section>

        <FocusPanel checklist={idea.focus} id="focus-four" />

        <section className="mt-10 rounded-3xl border border-line bg-card p-5 shadow-card" id="demand">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Demand</p>
              <h2 className="font-serif text-3xl">{idea.keyword}</h2>
            </div>
            <SampleBadge mode={idea.dataMode} />
          </div>
          <div className="mt-4 flex flex-wrap gap-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Volume</p>
              <p className="num font-serif text-4xl">{formatVolume(idea.keywordVolume)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Growth</p>
              <p className="num font-serif text-4xl text-teal">{formatGrowth(idea.keywordGrowth)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Country</p>
              <p className="font-serif text-4xl">{idea.keywordCountry}</p>
            </div>
          </div>
          <KeywordChart series={idea.keywordSeries} />
          <p className="mt-2 text-sm text-muted">{idea.keywordSource} As of {idea.keywordAsOf}. <a className="underline" href="#source-1">Source 1</a>.</p>
        </section>

        {idea.searchEvidence ? (
          <section className="mt-8 rounded-3xl border border-line bg-card p-5" id="searches">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">What people search for</p>
                <h2 className="font-serif text-3xl">{idea.searchEvidence.niche}</h2>
              </div>
              <SampleBadge mode={idea.searchEvidence.dataMode} />
            </div>
            <p className="mt-3 text-sm text-muted">{idea.searchEvidence.note}</p>
            <p className="mt-1 text-sm text-muted">{idea.searchEvidence.country} · {idea.searchEvidence.language} · {idea.searchEvidence.source} · as of {idea.searchEvidence.asOf}</p>
            {idea.searchEvidence.volume != null ? <p className="mt-2 text-sm">{idea.searchEvidence.volumeNote}</p> : null}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {([
                ["question", "Questions"],
                ["problem", "Problems"],
                ["desire", "Desires"],
              ] as const).map(([kind, label]) => {
                const lines = idea.searchEvidence!.suggestions.filter((suggestion) => suggestion.kind === kind);
                return (
                  <div key={kind}>
                    <p className="text-xs uppercase tracking-wide text-muted">{label} · {lines.length}</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {lines.length === 0 ? <li className="text-muted">None attached.</li> : null}
                      {lines.map((line) => (
                        <li key={line.text} className="rounded-xl bg-paper px-3 py-2">{line.text}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-3 sm:grid-cols-2" id="scores">
          {FACETS.map(([key, label]) => {
            const facet = idea.scores[key];
            return (
              <div key={key} className="rounded-2xl border border-line bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 font-serif text-4xl">{facet.value}<span className="text-lg text-muted">/10</span></p>
                <p className="font-semibold text-teal-dark">{facet.label}</p>
                <p className="mt-2 text-sm text-muted">{facet.why}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-line bg-card p-5" id="fit">
          <h2 className="font-serif text-3xl">Business fit</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label="Revenue band" value={`${idea.businessFit.revenueSymbols} · ${idea.businessFit.arrLabel}`} note={idea.businessFit.arrNote} sources={idea.sources} />
            <Fact label="Execution difficulty" value={`${idea.businessFit.difficulty}/10`} note={idea.businessFit.difficultyNote} sources={idea.sources} />
            <Fact label="Go to market" value={`${idea.businessFit.gtm}/10`} note={idea.businessFit.gtmNote} sources={idea.sources} />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Founder fit</p>
              {fit ? (
                <>
                  <p className="font-serif text-4xl">{fit.percent}%</p>
                  <p className="font-semibold">{fit.label} · {fit.archetype}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {fit.reasons.slice(0, 3).map((reason) => (
                      <li key={reason.text}>{reason.impact === "hurts" ? "↓" : "↑"} {reason.text}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">{fit.changes[0]}</p>
                </>
              ) : (
                <p className="mt-1 text-sm"><Link href="/fit" className="font-semibold text-teal">Take the fit quiz</Link> on Builder to see a match on this idea. The score is a weighted comparison, not a model opinion.</p>
              )}
            </div>
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Category</dt><dd>{idea.businessFit.category}</dd></div>
            <div><dt className="text-muted">Market</dt><dd>{idea.businessFit.market}</dd></div>
            <div><dt className="text-muted">Target</dt><dd>{idea.businessFit.target}</dd></div>
            <div><dt className="text-muted">Main alternative</dt><dd>{idea.businessFit.competitor}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted">{idea.businessFit.trendLine}</p>
        </section>

        <Section title="Community signals" id="community">
          <ul className="space-y-3">
            {idea.channels.length === 0 ? <li className="text-sm text-muted">No community URLs are attached yet.</li> : null}
            {idea.channels.map((channel) => (
              <li key={channel.url} className="rounded-2xl border border-line p-3">
                <p className="text-xs uppercase tracking-wide text-muted">{channel.platform}</p>
                <a href={channel.url} className="font-semibold underline decoration-line underline-offset-2">{channel.name}</a>
                <p className="text-sm text-muted">{channel.note}</p>
                {channel.sample ? <SampleBadge /> : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={FRAMEWORKS.offerLadder} id="offer">
          <ol className="grid gap-3 md:grid-cols-3">
            {idea.offerLadder.map((tier, index) => (
              <li key={tier.tier} className="rounded-2xl border border-line bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted">{index + 1}. {tier.tier}</p>
                <p className="mt-1 font-serif text-2xl">{tier.price}</p>
                <p className="mt-2 text-sm">{tier.detail}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Why now" id="why-now"><RichText text={idea.whyNow} sources={idea.sources} /></Section>
        <Section title="Proof" id="proof"><RichText text={idea.proof} sources={idea.sources} /></Section>
        <Section title="Market gap" id="gap"><RichText text={idea.marketGap} sources={idea.sources} /></Section>
        <Section title="Execution plan" id="plan"><RichText text={idea.executionPlan} sources={idea.sources} /></Section>

        <Section title="Frameworks" id="frameworks">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line p-4">
              <h3 className="font-serif text-2xl">{FRAMEWORKS.positionMap}</h3>
              <p className="text-sm text-muted">Uniqueness {idea.frameworks.uniqueness}/10 · Value {idea.frameworks.value}/10 · <strong>{idea.frameworks.position}</strong></p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {["Breakthrough", "Category Leader", "Quiet Niche", "Crowded Commodity"].map((name) => (
                  <div key={name} className={`rounded-xl p-3 ${name === idea.frameworks.position ? "bg-teal text-white" : "bg-paper"}`}>{name}</div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line p-4">
              <h3 className="font-serif text-2xl">{FRAMEWORKS.signalTriangle}</h3>
              {([
                ["Audience reach", idea.frameworks.signalTriangle.audience],
                ["Community heat", idea.frameworks.signalTriangle.community],
                ["Offer clarity", idea.frameworks.signalTriangle.offer],
              ] as const).map(([label, value]) => (
                <div key={label} className="mt-3">
                  <div className="flex justify-between text-sm"><span>{label}</span><span className="num">{value}/10</span></div>
                  <div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-teal" style={{ width: `${value * 10}%` }} /></div>
                </div>
              ))}
              <p className="mt-3 text-sm text-muted">{idea.frameworks.note}</p>
            </div>
          </div>
        </Section>

        <section className="mt-10" id="build">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-4xl">Build this idea</h2>
              <p className="mt-1 text-sm text-muted">A prompt per tool, generated from this brief. {galleryCount} gallery submission{galleryCount === 1 ? "" : "s"} link here.</p>
            </div>
            <Link href="/built-with" className="text-sm font-semibold text-teal">Open the gallery</Link>
          </div>
          <div className="mt-4">
            <BuildGuideTabs slug={idea.slug} guides={guides} />
          </div>
        </section>

        <div className="mt-10">
          <AdvisorPanel ideaId={idea.id} enabled={advisorEnabled} signedIn={signedIn} />
        </div>

        <SourceList sources={idea.sources} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-3xl border border-line bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted">Scores</p>
          {FACETS.map(([key, label]) => (
            <div key={key} className="mt-3 flex items-baseline justify-between">
              <span className="text-sm">{label}</span>
              <span className="num font-serif text-2xl">{idea.scores[key].value}</span>
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">On this page</p>
          <ul className="mt-2 space-y-1 text-sm">
            {[
              ["#pitch", "Pitch"],
              ["#demand", "Demand"],
              ...(idea.searchEvidence ? [["#searches", "Searches"] as const] : []),
              ["#scores", "Scores"],
              ["#fit", "Business fit"],
              ["#community", "Community"],
              ["#offer", "Offer ladder"],
              ["#why-now", "Why now"],
              ["#proof", "Proof"],
              ["#gap", "Market gap"],
              ["#plan", "Execution"],
              ["#frameworks", "Frameworks"],
              ["#build", "Build this idea"],
              ["#advisor", "Advisor"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} className="text-muted hover:text-ink">{label}</a></li>
            ))}
          </ul>
        </div>
        {signedIn ? (
          <form action={`/api/ideas/${idea.slug}/save`} method="post">
            <button className="w-full rounded-full border border-line bg-card px-3 py-2 text-sm" type="submit">Save idea</button>
          </form>
        ) : null}
        <Link href="/build" className="block rounded-full bg-teal px-3 py-2 text-center text-sm text-white">Open a project</Link>
      </aside>
    </article>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section className="mt-10" id={id}>
      <h2 className="font-serif text-4xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({ label, value, note, sources }: { label: string; value: string; note: string; sources: IdeaView["sources"] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-serif text-2xl">{value}</p>
      <div className="text-sm text-muted"><RichText text={note} sources={sources} /></div>
    </div>
  );
}
