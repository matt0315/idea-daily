import { db } from "./db";
import { deliverIssue, ensureNewsletterIssue } from "./newsletter";

export async function publishIdea(id: string): Promise<{ ok: true; emailed: number; skipped: boolean } | { ok: false; error: string }> {
  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return { ok: false, error: "missing" };
  if (idea.status === "PUBLISHED") return { ok: false, error: "already_published" };
  if (idea.status !== "APPROVED" && idea.status !== "QUEUED") return { ok: false, error: "not_ready" };

  const updated = await db.idea.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  const issue = await ensureNewsletterIssue(updated);
  const delivery = await deliverIssue(issue.id);

  await db.pipelineRun.create({
    data: {
      kind: "publish-email",
      status: delivery.skipped ? "skipped" : "sent",
      dataMode: updated.dataMode,
      log: { slug: updated.slug, issue: issue.slug, recipients: delivery.recipients, sent: delivery.sent, skipped: delivery.skipped },
    },
  });

  return { ok: true, emailed: delivery.sent, skipped: delivery.skipped };
}

/** Publishes the oldest approved idea. Used by the morning job. */
export async function publishNextApproved() {
  const next = await db.idea.findFirst({ where: { status: "APPROVED" }, orderBy: { createdAt: "asc" } });
  if (!next) return { published: false as const };
  const result = await publishIdea(next.id);
  return { published: result.ok, slug: next.slug, result };
}
