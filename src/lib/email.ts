import { brand } from "./brand";
import { Resend } from "resend";

export function dailyEmailHtml(idea: { title: string; summary: string; slug: string; dataMode: string }): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/ideas/${idea.slug}`;
  const sample =
    idea.dataMode === "SAMPLE"
      ? `<p style="color:#a16207">Sample data: figures in this idea are labelled placeholders, not live measurements.</p>`
      : "";
  return `<div style="font-family:Georgia,serif;color:#1c1915;max-width:560px">
    <p style="letter-spacing:.14em;text-transform:uppercase;font-family:sans-serif;font-size:12px">${brand.name}</p>
    <h1>${escapeHtml(idea.title)}</h1>
    <p>${escapeHtml(idea.summary)}</p>
    ${sample}
    <p><a href="${url}">Read the idea</a></p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendDailyEmail(idea: { title: string; summary: string; slug: string; dataMode: string }, recipients: string[]): Promise<{ sent: number; skipped: boolean; error?: string }> {
  const html = dailyEmailHtml(idea);
  const key = process.env.RESEND_API_KEY;
  if (!key || recipients.length === 0) {
    return { sent: 0, skipped: true };
  }
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM || `${brand.name} <ideas@example.com>`;
  let sent = 0;
  for (const to of recipients) {
    const result = await resend.emails.send({
      from,
      to,
      subject: `${brand.name}: ${idea.title}`,
      html,
    });
    if (!result.error) sent += 1;
  }
  return { sent, skipped: false };
}
