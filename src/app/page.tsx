import Link from "next/link";
import { SampleBadge } from "@/components/sample-badge";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { formatGrowth, formatVolume, toIdeaView } from "@/lib/idea-view";

export default async function HomePage() {
  const latest = await db.idea.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  const more = await db.idea.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 6, skip: latest ? 1 : 0 });
  const trends = await db.trend.findMany({ where: { country: "US", commercial: true }, orderBy: { growthPct: "desc" }, take: 4 });
  const idea = latest ? toIdeaView(latest) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">{brand.tagline}</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
        One startup idea a day, with a footnote on every figure.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        {brand.name} publishes a full idea report, keeps the archive public, and refuses to print a statistic that does not link to its source. Missing keys stay on labelled sample data.
      </p>

      {idea ? (
        <section className="mt-10 rounded-[2rem] border border-line bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Idea of the day <SampleBadge mode={idea.dataMode} />
          </div>
          <h2 className="mt-3 font-serif text-4xl">{idea.title}</h2>
          <p className="mt-3 max-w-3xl text-lg">{idea.summary}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Chip label="Opportunity" value={`${idea.opportunity}/10`} />
            <Chip label="Pain" value={`${idea.pain}/10`} />
            <Chip label="Buildability" value={`${idea.buildability}/10`} />
            <Chip label="Timing" value={`${idea.timing}/10`} />
            <Chip label={idea.keyword} value={`${formatVolume(idea.keywordVolume)} · ${formatGrowth(idea.keywordGrowth)}`} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/ideas/${idea.slug}`} className="rounded-full bg-teal px-4 py-2 text-sm text-white">Read the report</Link>
            <Link href="/today" className="rounded-full border border-line px-4 py-2 text-sm">Today’s page</Link>
          </div>
        </section>
      ) : (
        <p className="mt-8">No published idea yet. Approve one in admin.</p>
      )}

      <form action="/api/subscribe" method="post" className="mt-8 flex flex-wrap gap-2">
        <input name="email" type="email" required placeholder="Email for the daily idea" className="min-w-64 flex-1 rounded-full border border-line bg-card px-4 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Send it</button>
      </form>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-3xl">Recent public ideas</h2>
          <Link href="/ideas" className="text-sm font-semibold text-teal">Search the database</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {more.map((row) => (
            <Link key={row.id} href={`/ideas/${row.slug}`} className="rounded-2xl border border-line bg-card p-4 hover:border-teal">
              <p className="text-xs uppercase tracking-wide text-muted">{row.category}</p>
              <h3 className="mt-1 font-serif text-2xl">{row.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{row.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-3xl">Trend teasers</h2>
          <Link href="/trends" className="text-sm font-semibold text-teal">Trends library</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {trends.map((trend) => (
            <article key={trend.id} className="rounded-2xl border border-line bg-card p-4">
              <SampleBadge mode={trend.dataMode} />
              <h3 className="mt-2 font-semibold">{trend.keyword}</h3>
              <p className="num mt-2 text-sm text-muted">{formatVolume(trend.volume ?? 0)} · {formatGrowth(trend.growthPct ?? 0)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-paper px-3 py-1">
      <span className="text-muted">{label}</span> <span className="num font-semibold">{value}</span>
    </span>
  );
}
