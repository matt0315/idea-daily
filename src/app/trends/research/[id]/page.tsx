import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBadge } from "@/components/sample-badge";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatGrowth, formatVolume } from "@/lib/idea-view";
import type { TrendResearchResult } from "@/lib/trend-research";

export default async function TrendResearchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const query = await db.trendQuery.findUnique({ where: { id } });
  if (!query || query.userId !== user?.id) notFound();
  const result = query.result as TrendResearchResult;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-teal">Trends research · {result.country}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="font-serif text-5xl">{result.seed}</h1>
        <SampleBadge mode={result.dataMode} />
      </div>
      <p className="mt-3 text-sm text-muted">{result.note}</p>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Keyword</th><th>Volume</th><th>Growth</th><th>Intent</th></tr></thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.keyword} className="border-t border-line">
                <td className="p-3">{row.keyword}</td>
                <td className="num">{row.volume == null ? "—" : formatVolume(row.volume)}</td>
                <td className="num">{row.growthPct == null ? "—" : formatGrowth(row.growthPct)}</td>
                <td className="num">{row.intent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {result.clusters.map((cluster) => (
          <article key={cluster.name} className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-serif text-2xl">{cluster.name}</h2>
            <p className="mt-2 text-sm text-muted">{cluster.explainer}</p>
            <p className="mt-2 text-sm">{cluster.keywords.join(", ")}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="rounded-full bg-teal px-4 py-2 text-white" href={`/generate?trend=${encodeURIComponent(result.seed)}`}>Generate ideas</Link>
        <Link className="rounded-full border border-line px-4 py-2" href={`/research?seed=${encodeURIComponent(result.seed)}`}>Send to Idea Agent</Link>
      </div>
    </div>
  );
}
