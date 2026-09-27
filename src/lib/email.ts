import { renderLetterHtml, templateLetter } from "./letter";
import { scoreFocus } from "./focus";

/** Kept for callers that only need a preview string. Sending lives in newsletter.ts. */
export function dailyEmailHtml(idea: { title: string; summary: string; slug: string; dataMode: string }): string {
  const checklist = scoreFocus(
    {
      customer: idea.summary,
      pain: idea.summary,
      offer: idea.title,
      price: "",
      funnel: [],
      channel: "",
    },
    idea.dataMode === "LIVE" ? "LIVE" : "SAMPLE",
  );
  const letter = templateLetter({ title: idea.title, slug: idea.slug, summary: idea.summary, checklist });
  return renderLetterHtml(letter, {
    unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/letter/unsubscribed`,
    preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account`,
    showPs: true,
    scheme: "auto",
  });
}
