import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvisorPanel } from "@/components/advisor-panel";
import { SampleBadge } from "@/components/sample-badge";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import type { ResearchReport } from "@/lib/research";

const STEPS = ["Keywords", "Demand", "Competition", "Customer voice", "Market sizing", "Verdict"];

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const report = await db.researchReport.findUnique({ where: { id } });
  if (!report || report.userId !== user?.id) notFound();
  const body = report.report as ResearchReport | null;
  const plan = asPlan(user.plan);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.16em] text-teal">Idea Agent</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="font-serif text-4xl">{report.title}</h1>
        <SampleBadge mode={report.dataMode} />
      </div>
      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((step) => (
          <li key={step} className={`rounded-full px-2 py-1 ${report.status === "complete" ? "bg-teal-soft text-teal-dark" : "bg-paper"}`}>{step}</li>
        ))}
      </ol>
      {body ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-teal bg-teal-soft p-5">
            <p className="text-xs uppercase tracking-wide">Verdict</p>
            <p className="font-serif text-5xl">{body.verdict}</p>
            <p className="text-sm">{body.confidence}% confidence on the stored inputs, not on the size of the market.</p>
          </section>
          <Section title="Demand">
            <p>{body.demand.summary}</p>
            <p className="num mt-2 text-sm">Volume {body.demand.volume ?? "—"} · Growth {body.demand.growthPct ?? "—"}</p>
          </Section>
          <Section title="Competitors">
            <ul className="space-y-2">
              {body.competitors.map((row) => (
                <li key={row.name}><a className="font-semibold underline" href={row.url}>{row.name}</a> — {row.note} {row.sample ? <SampleBadge /> : null}</li>
              ))}
            </ul>
          </Section>
          <Section title="Customer pain">
            <ul className="space-y-2">
              {body.pains.map((pain) => (
                <li key={pain.text} className="rounded-2xl bg-paper p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">{pain.label}</span>
                  <p className="mt-1">{pain.text}</p>
                  <a className="text-sm underline" href={pain.url}>Source</a>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Market sizing">
            <p><strong>Top down.</strong> {body.sizing.topDown}</p>
            <p className="mt-2"><strong>Bottom up.</strong> {body.sizing.bottomUp}</p>
          </Section>
          <Section title="Scores">
            <p className="num">Opportunity {body.scores.opportunity} ({body.scores.labels.opportunity}) · Pain {body.scores.pain} ({body.scores.labels.pain}) · Buildability {body.scores.buildability} ({body.scores.labels.buildability}) · Timing {body.scores.timing} ({body.scores.labels.timing})</p>
          </Section>
          <Section title="Three pivots">
            <ol className="list-decimal space-y-1 pl-5">{body.pivots.map((pivot) => <li key={pivot}>{pivot}</li>)}</ol>
          </Section>
          <Section title="Next execution step"><p>{body.execution}</p></Section>
          <ol className="space-y-2 text-sm text-muted">
            {body.sources.map((source) => (
              <li key={source.id} id={`source-${source.id}`}><a className="underline text-ink" href={source.url}>{source.id}. {source.title}</a> — {source.note}</li>
            ))}
          </ol>
          <form action="/api/projects" method="post">
            <input type="hidden" name="reportId" value={report.id} />
            <input type="hidden" name="title" value={report.title} />
            <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Save into a project</button>
          </form>
          <AdvisorPanel reportId={report.id} enabled={canAccess(plan, "advisor")} signedIn />
        </div>
      ) : (
        <p className="mt-6">This run is {report.status}.</p>
      )}
      <p className="mt-6 text-sm"><Link href="/research" className="underline">All reports</Link></p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="mt-2 text-[17px] leading-7">{children}</div>
    </section>
  );
}
