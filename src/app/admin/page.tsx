import { redirect } from "next/navigation";
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
  const status = integrationStatus();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl">Review queue</h1>
      <p className="mt-2 text-sm text-muted">The nightly job queues candidates. Nothing publishes until you approve it. Publish sends the daily email when Resend is configured.</p>
      <form action="/api/admin/pipeline" method="post" className="mt-4 flex flex-wrap gap-2">
        <button name="kind" value="daily" className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Run idea pipeline</button>
        <button name="kind" value="trends" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Refresh trends</button>
        <button name="kind" value="publish" className="rounded-full border border-line px-4 py-2 text-sm" type="submit">Publish next approved</button>
      </form>
      <pre className="mt-4 overflow-auto rounded-2xl bg-card p-3 text-xs">{JSON.stringify(status, null, 2)}</pre>
      <h2 className="mt-8 font-serif text-3xl">Ideas</h2>
      <ul className="mt-3 space-y-3">
        {queued.map((idea) => (
          <li key={idea.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-serif text-2xl">{idea.title}</p>
            <p className="text-sm text-muted">{idea.status} · {idea.dataMode} · {idea.summary}</p>
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
