import { db } from "./db";
import { sendDailyEmail } from "./email";

export async function publishIdea(id: string): Promise<{ ok: true; emailed: number; skipped: boolean } | { ok: false; error: string }> {
  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return { ok: false, error: "missing" };
  if (idea.status === "PUBLISHED") return { ok: false, error: "already_published" };
  if (idea.status !== "APPROVED" && idea.status !== "QUEUED") return { ok: false, error: "not_ready" };

  const updated = await db.idea.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  const subscribers = await db.subscriber.findMany();
  const users = await db.user.findMany({ where: { emailOptIn: true } });
  const recipients = Array.from(new Set([...subscribers.map((row) => row.email), ...users.map((row) => row.email)]));
  const delivery = await sendDailyEmail(
    { title: updated.title, summary: updated.summary, slug: updated.slug, dataMode: updated.dataMode },
    recipients,
  );

  await db.pipelineRun.create({
    data: {
      kind: "publish-email",
      status: delivery.skipped ? "skipped" : "sent",
      dataMode: updated.dataMode,
      log: { slug: updated.slug, recipients: recipients.length, sent: delivery.sent, skipped: delivery.skipped },
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
