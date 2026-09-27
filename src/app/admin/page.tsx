import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTOCOMPLETE_LANGUAGES, AUTOCOMPLETE_MARKETS } from "@/lib/autocomplete/markets";
import { releaseDelayDays } from "@/lib/community/settings";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrationStatus } from "@/lib/data-mode";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/");
  const queued = await db.idea.findMany({ where: { status: { in: ["QUEUED", "APPROVED", "CANDIDATE"] } }, orderBy: { createdAt: "desc" } });
  const pendingGallery = await db.galleryItem.findMany({ where: { status: "pending" }, include: { idea: true } });
  const runs = await db.pipelineRun.findMany({ orderBy: { createdAt: "desc" }, take: 6 });
  const seeds = await db.autocompleteSeed.findMany({ orderBy: { niche: "asc" } });
  const releaseDays = await releaseDelayDays(db);
  const status = integrationStatus();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl">Review queue</h1>
      <p className="mt-2 text-sm text-muted">The nightly job queues candidates, including a few Alphabet Demand drafts from the seed list. Nothing publishes until you approve it. Publish writes the daily letter and sends it when Resend is configured. <Link className="underline" href="/admin/letter">Preview the letter</Link>.</p>
      <form action="/api/admin/pipeline" method="post" className="mt-4 flex flex-wrap gap-2">
        <button name="kind" value="daily" className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Run idea pipeline</button>
        <button name="kind" value="autocomplete" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Run search mining only</button>
        <button name="kind" value="release" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Release due community mines</button>
        <button name="kind" value="trends" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Refresh trends</button>
        <button name="kind" value="publish" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Publish next approved</button>
      </form>
      <pre className="mt-4 overflow-auto rounded-2xl bg-card p-3 text-xs">{JSON.stringify(status, null, 2)}</pre>
      <h2 className="mt-8 font-serif text-3xl">Community release delay</h2>
      <p className="mt-1 text-sm text-muted">Private mines, Idea Agent runs, and trends research become anonymised queue candidates after this many days. The same number is the shared-cache window. Default is 7. Cache hits do not spend quota.</p>
      <form action="/api/admin/settings" method="post" className="mt-3 flex flex-wrap items-center gap-2">
        <input name="days" type="number" min={1} max={90} defaultValue={releaseDays} className="w-24 rounded-full border border-line px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Save delay</button>
      </form>
      <h2 className="mt-8 font-serif text-3xl">Alphabet Demand seeds</h2>
      <p className="mt-1 text-sm text-muted">Each night rotates the oldest active niches. Never-run niches go first. Default is three per night.</p>
      <form action="/api/admin/seeds" method="post" className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="action" value="create" />
        <input name="niche" placeholder="Niche" className="rounded-full border border-line px-3 py-2" />
        <select name="country" className="rounded-full border border-line bg-card px-3 py-2">
          {AUTOCOMPLETE_MARKETS.map((market) => <option key={market.code} value={market.code}>{market.code}</option>)}
        </select>
        <select name="language" className="rounded-full border border-line bg-card px-3 py-2">
          {AUTOCOMPLETE_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
        </select>
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Add seed</button>
      </form>
      <ul className="mt-3 space-y-2 text-sm">
        {seeds.map((seed) => (
          <li key={seed.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
            <span>{seed.niche} · {seed.country} · {seed.language} · {seed.active ? "active" : "paused"}{seed.lastRunAt ? ` · last ${seed.lastRunAt.toISOString().slice(0, 10)}` : " · never run"}</span>
            <span className="flex gap-2">
              <form action="/api/admin/seeds" method="post">
                <input type="hidden" name="action" value="toggle" />
                <input type="hidden" name="id" value={seed.id} />
                <button className="underline" type="submit">{seed.active ? "Pause" : "Resume"}</button>
              </form>
              <form action="/api/admin/seeds" method="post">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="id" value={seed.id} />
                <button className="underline" type="submit">Remove</button>
              </form>
            </span>
          </li>
        ))}
        {seeds.length === 0 ? <li className="text-muted">No seeds yet. The nightly miner skips this source until you add one.</li> : null}
      </ul>
      <h2 className="mt-8 font-serif text-3xl">Ideas</h2>
      <ul className="mt-3 space-y-3">
        {queued.map((idea) => (
          <li key={idea.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-serif text-2xl">{idea.title}</p>
            <p className="text-sm text-muted">{idea.status} · {idea.ideaType} · {idea.dataMode} · {idea.summary}</p>
            <div className="mt-2 flex gap-2">
              <AdminAction id={idea.id} action="approve" label="Approve" />
              <AdminAction id={idea.id} action="publish" label="Publish now" />
              <AdminAction id={idea.id} action="reject" label="Reject" />
            </div>
          </li>
        ))}
        {queued.length === 0 ? <li className="text-sm text-muted">Queue is empty.</li> : null}
      </ul>
      <h2 className="mt-8 font-serif text-3xl">Gallery submissions</h2>
      <ul className="mt-3 space-y-2">
        {pendingGallery.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-card p-3 text-sm">
            {item.title} · {item.tool}
            <form action={`/api/admin/gallery/${item.id}`} method="post" className="mt-2">
              <button name="status" value="approved" className="mr-2 underline" type="submit">Approve</button>
              <button name="status" value="rejected" className="underline" type="submit">Reject</button>
            </form>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-serif text-3xl">Recent jobs</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {runs.map((run) => (
          <li key={run.id} className="rounded-xl bg-card p-3">
            <span className="font-semibold">{run.kind}</span> · {run.status} · {run.dataMode}
            <pre className="mt-1 whitespace-pre-wrap text-xs text-muted">{JSON.stringify(run.log)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminAction({ id, action, label }: { id: string; action: string; label: string }) {
  return (
    <form action={`/api/admin/ideas/${id}`} method="post">
      <input type="hidden" name="action" value={action} />
      <button className="rounded-full border border-line px-3 py-1 text-sm" type="submit">{label}</button>
    </form>
  );
}
