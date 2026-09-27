import type { Idea } from "@prisma/client";
import { Resend } from "resend";
import { brand } from "./brand";
import { db } from "./db";
import { newEmailToken } from "./email-token";
import { readFocusChecklist, checklistFromIdeaFields } from "./focus";
import { appOrigin, composeLetter, isLetterContent, renderLetterHtml, type LetterContent } from "./letter";

function checklistFor(idea: Idea) {
  return (
    readFocusChecklist(idea.focusChecklist) ??
    checklistFromIdeaFields({
      title: idea.title,
      summary: idea.summary,
      target: (idea.businessFit as { target?: string }).target,
      offerDetail: Array.isArray(idea.offerLadder) ? (idea.offerLadder[0] as { detail?: string } | undefined)?.detail : "",
      price: Array.isArray(idea.offerLadder) ? (idea.offerLadder[0] as { price?: string } | undefined)?.price : "",
      channel: (idea.community as { channels?: { name?: string }[] }).channels?.[0]?.name,
      executionPlan: idea.executionPlan,
    })
  );
}

export function issueSlug(publishedAt: Date | null, ideaSlug: string): string {
  const day = (publishedAt ?? new Date()).toISOString().slice(0, 10);
  return `${day}-${ideaSlug}`;
}

export async function ensureNewsletterIssue(idea: Idea) {
  const existing = await db.newsletterIssue.findFirst({ where: { ideaId: idea.id } });
  if (existing) return existing;
  const checklist = checklistFor(idea);
  const content = await composeLetter({
    title: idea.title,
    slug: idea.slug,
    summary: idea.summary,
    checklist,
    publishedAt: idea.publishedAt ?? undefined,
  });
  const slug = issueSlug(idea.publishedAt, idea.slug);
  return db.newsletterIssue.create({
    data: {
      slug,
      ideaId: idea.id,
      subject: content.subject,
      content: content as object,
      dataMode: content.dataMode,
    },
  });
}

async function userToken(id: string, current: string | null): Promise<string> {
  if (current) return current;
  const token = newEmailToken();
  await db.user.update({ where: { id }, data: { emailToken: token } });
  return token;
}

export async function letterRecipients(): Promise<{ email: string; token: string; showPs: boolean }[]> {
  const users = await db.user.findMany({ where: { emailOptIn: true }, select: { id: true, email: true, emailToken: true, founderProfile: true } });
  const subscribers = await db.subscriber.findMany({ where: { unsubscribedAt: null }, select: { id: true, email: true, token: true } });
  const seen = new Set<string>();
  const rows: { email: string; token: string; showPs: boolean }[] = [];
  for (const user of users) {
    const email = user.email.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    rows.push({ email, token: await userToken(user.id, user.emailToken), showPs: user.founderProfile == null });
  }
  for (const subscriber of subscribers) {
    const email = subscriber.email.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    let token = subscriber.token;
    if (!token) {
      token = newEmailToken();
      await db.subscriber.update({ where: { id: subscriber.id }, data: { token } });
    }
    rows.push({ email, token, showPs: true });
  }
  return rows;
}

export async function deliverIssue(issueId: string): Promise<{ sent: number; skipped: boolean; recipients: number }> {
  const issue = await db.newsletterIssue.findUnique({ where: { id: issueId } });
  if (!issue || !isLetterContent(issue.content)) return { sent: 0, skipped: true, recipients: 0 };
  const recipients = await letterRecipients();
  const key = process.env.RESEND_API_KEY;
  if (!key || recipients.length === 0) return { sent: 0, skipped: true, recipients: recipients.length };
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM || `${brand.name} <ideas@example.com>`;
  const origin = appOrigin();
  let sent = 0;
  for (const recipient of recipients) {
    const html = renderLetterHtml(issue.content, {
      unsubscribeUrl: `${origin}/api/letter/unsubscribe?token=${recipient.token}`,
      preferencesUrl: `${origin}/letter/preferences?token=${recipient.token}`,
      showPs: recipient.showPs,
      scheme: "auto",
    });
    const result = await resend.emails.send({ from, to: recipient.email, subject: issue.subject, html });
    if (!result.error) sent += 1;
  }
  return { sent, skipped: false, recipients: recipients.length };
}

export function previewHtml(content: LetterContent, scheme: "light" | "dark" | "auto"): string {
  const origin = appOrigin();
  return renderLetterHtml(content, {
    unsubscribeUrl: `${origin}/letter/unsubscribed`,
    preferencesUrl: `${origin}/account`,
    showPs: true,
    scheme,
  });
}

export async function sendTestLetter(issueId: string, to: string): Promise<"sent" | "skipped" | "missing"> {
  const issue = await db.newsletterIssue.findUnique({ where: { id: issueId } });
  if (!issue || !isLetterContent(issue.content)) return "missing";
  if (!process.env.RESEND_API_KEY) return "skipped";
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || `${brand.name} <ideas@example.com>`;
  const html = previewHtml(issue.content, "auto");
  const result = await resend.emails.send({ from, to, subject: `[Test] ${issue.subject}`, html });
  return result.error ? "skipped" : "sent";
}
