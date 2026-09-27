import { brand } from "./brand";
import { FOCUS_QUESTIONS, type FocusChecklist } from "./focus";
import { completeText, llmConfigured } from "./llm";

export type LetterContent = {
  subject: string;
  opener: string;
  problems: string[];
  frameworkName: string;
  frameworkIntro: string;
  questions: { label: string; question: string }[];
  exampleTitle: string;
  checks: { key: string; label: string; passed: boolean; evidence: string; rationale: string }[];
  takeaway: string;
  ctaLabel: string;
  ctaPath: string;
  signoff: string;
  senderName: string;
  ps: string;
  dataMode: "SAMPLE" | "LIVE";
  ideaTitle: string;
};

const OPENERS = [
  "You do not need another idea. You need one you will still be building in October.",
  "Twelve tabs open, and Monday still has no customer with a name.",
  "The build was the easy part. Asking for the card was not on the list.",
  "A clever product with no path to paid is a hobby with a login screen.",
];

const PROBLEM_FOR = {
  customer: "You can describe a market and still not name the person who would pay you this month.",
  offer: "The thing you sell does two jobs, so the price is a shrug.",
  funnel: "Someone can hear about it and still have no step that asks for money.",
  channel: "You are talking where you already stand, not where they already gather.",
} as const;

const DEFAULT_PROBLEMS = [
  "You keep a shortlist and never pick one idea for the next 90 days.",
  "You shipped the feature and still cannot point to the step that asks for money.",
];

function pick(items: string[], seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return items[hash % items.length];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function templateLetter(input: {
  title: string;
  slug: string;
  summary: string;
  checklist: FocusChecklist;
  publishedAt?: Date;
}): LetterContent {
  const failed = input.checklist.checks.filter((check) => !check.passed);
  const fromChecks = failed.map((check) => PROBLEM_FOR[check.key]);
  const problems = [...fromChecks, ...DEFAULT_PROBLEMS].filter((line, index, all) => all.indexOf(line) === index).slice(0, 2);
  const missing = failed.map((check) => check.label.toLowerCase()).join(" and ");
  const takeaway =
    input.checklist.verdict === "pass"
      ? `Give ${input.title} the next 90 days. The four checks already have a sentence each.`
      : `Do not open the editor until ${missing} have a sentence of evidence.`;
  const day = (input.publishedAt ?? new Date()).toISOString().slice(0, 10);
  void day;
  return {
    subject:
      input.checklist.verdict === "pass"
        ? `${brand.name}: this one can hold 90 days — ${input.title}`
        : `${brand.name}: where ${input.title} still wobbles`,
    opener: pick(OPENERS, input.slug),
    problems,
    frameworkName: brand.focusName,
    frameworkIntro: `${brand.focusName} is four questions. If any answer is a category instead of a sentence you could say out loud, the idea is not ready to build.`,
    questions: FOCUS_QUESTIONS.map((item) => ({ label: item.label, question: item.question })),
    exampleTitle: input.title,
    checks: input.checklist.checks.map((check) => ({
      key: check.key,
      label: check.label,
      passed: check.passed,
      evidence: check.evidence,
      rationale: check.rationale,
    })),
    takeaway,
    ctaLabel: `Read ${input.title}`,
    ctaPath: `/ideas/${input.slug}`,
    signoff: `I'll be here tomorrow with another one. If this idea is not yours, the four questions still are.\n${brand.senderName}`,
    senderName: brand.senderName,
    ps: "If Founder Fit is still empty, fill it before you add another idea to the pile.",
    dataMode: input.checklist.dataMode,
    ideaTitle: input.title,
  };
}

const BANNED = /1-1-1-1|vibe island/i;

function cleanLine(value: unknown, fallback: string, max = 400): string {
  const text = String(value || "").trim();
  if (text.length < 8 || text.length > max || BANNED.test(text)) return fallback;
  return text;
}

/** Fills the letter from today's idea. A model may rewrite the prose. The checks stay on the scorer. */
export async function composeLetter(input: {
  title: string;
  slug: string;
  summary: string;
  checklist: FocusChecklist;
  publishedAt?: Date;
}): Promise<LetterContent> {
  const base = templateLetter(input);
  if (!llmConfigured()) return base;
  const result = await completeText(
    `Write a short founder letter as JSON with keys opener, problems (array of 1 or 2 strings), frameworkIntro, takeaway, signoff.
Use the checklist results you are given. Do not flip a yes into a no. Do not invent customers.
Plain speech. No slogan, no 1-1-1-1 label, no borrowed examples.
signoff should end with the sender name provided.`,
    JSON.stringify({
      title: input.title,
      summary: input.summary,
      senderName: brand.senderName,
      frameworkName: brand.focusName,
      checks: base.checks,
      fallback: { opener: base.opener, problems: base.problems, takeaway: base.takeaway },
    }),
  );
  if (!result.ok) return base;
  const start = result.text.indexOf("{");
  const end = result.text.lastIndexOf("}");
  if (start < 0 || end <= start) return base;
  try {
    const body = JSON.parse(result.text.slice(start, end + 1)) as {
      opener?: string;
      problems?: string[];
      frameworkIntro?: string;
      takeaway?: string;
      signoff?: string;
    };
    const problems = Array.isArray(body.problems)
      ? body.problems.map((line) => cleanLine(line, "")).filter(Boolean).slice(0, 2)
      : [];
    return {
      ...base,
      opener: cleanLine(body.opener, base.opener, 280),
      problems: problems.length > 0 ? problems : base.problems,
      frameworkIntro: cleanLine(body.frameworkIntro, base.frameworkIntro, 500),
      takeaway: cleanLine(body.takeaway, base.takeaway, 280),
      signoff: cleanLine(body.signoff, base.signoff, 400),
      dataMode: "LIVE",
    };
  } catch {
    return base;
  }
}

export function isLetterContent(value: unknown): value is LetterContent {
  if (!value || typeof value !== "object") return false;
  const row = value as LetterContent;
  return typeof row.opener === "string" && Array.isArray(row.problems) && Array.isArray(row.checks) && typeof row.takeaway === "string" && typeof row.ctaPath === "string";
}

export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function renderLetterHtml(
  letter: LetterContent,
  options: {
    unsubscribeUrl: string;
    preferencesUrl: string;
    showPs?: boolean;
    scheme?: "light" | "dark" | "auto";
  },
): string {
  const origin = appOrigin();
  const cta = `${origin}${letter.ctaPath.startsWith("/") ? letter.ctaPath : `/${letter.ctaPath}`}`;
  const fit = `${origin}/fit`;
  const scheme = options.scheme ?? "auto";
  const htmlClass = scheme === "dark" ? "force-dark" : scheme === "light" ? "force-light" : "";
  const problems = letter.problems
    .map((problem) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;">${escapeHtml(problem)}</p>`)
    .join("");
  const questions = letter.questions
    .map(
      (item) =>
        `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>${escapeHtml(item.label)}.</strong> ${escapeHtml(item.question)}</p>`,
    )
    .join("");
  const checks = letter.checks
    .map((check) => {
      const mark = check.passed ? "Yes" : "No";
      return `<p style="margin:16px 0 4px;font-size:16px;line-height:1.45;"><strong>${escapeHtml(check.label)} — ${mark}.</strong></p>
        <p style="margin:0 0 4px;font-size:16px;line-height:1.5;">${escapeHtml(check.evidence)}</p>
        <p class="muted" style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#5c564c;">${escapeHtml(check.rationale)}</p>`;
    })
    .join("");
  const sample =
    letter.dataMode === "SAMPLE"
      ? `<p class="muted" style="margin:0 0 16px;font-size:13px;line-height:1.45;color:#5c564c;">Sample wording. The checks below come from the written scorer, not a live model, and they are not market measurements.</p>`
      : "";
  const ps = options.showPs === false
    ? ""
    : `<p style="margin:20px 0 0;font-size:16px;line-height:1.55;"><strong>PS.</strong> ${escapeHtml(letter.ps)} <a href="${escapeHtml(fit)}">Founder Fit</a>.</p>`;
  const signoff = escapeHtml(letter.signoff).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en" class="${htmlClass}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(letter.subject)}</title>
<style>
  body { margin:0; padding:0; background:#f4efe6; color:#1c1915; }
  a { color:#1f6f5b; }
  .sheet { background:#fffdf8; }
  .button { background:#1f6f5b; color:#ffffff !important; }
  @media (prefers-color-scheme: dark) {
    body, .bg { background:#161311 !important; color:#f4efe6 !important; }
    .sheet { background:#241f1b !important; color:#f4efe6 !important; }
    .muted { color:#d9d0c3 !important; }
    a { color:#8fd0bf !important; }
    .button { background:#8fd0bf !important; color:#161311 !important; }
  }
  .force-dark, .force-dark body, .force-dark .bg { background:#161311 !important; color:#f4efe6 !important; }
  .force-dark .sheet { background:#241f1b !important; color:#f4efe6 !important; }
  .force-dark .muted { color:#d9d0c3 !important; }
  .force-dark a { color:#8fd0bf !important; }
  .force-dark .button { background:#8fd0bf !important; color:#161311 !important; }
  .force-light, .force-light body, .force-light .bg { background:#f4efe6 !important; color:#1c1915 !important; }
  .force-light .sheet { background:#fffdf8 !important; color:#1c1915 !important; }
</style>
</head>
<body class="bg" bgcolor="#f4efe6" style="margin:0;padding:0;background:#f4efe6;color:#1c1915;">
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4efe6" style="background:#f4efe6;">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table role="presentation" class="sheet" width="560" cellpadding="0" cellspacing="0" bgcolor="#fffdf8" style="width:560px;max-width:560px;background:#fffdf8;border-radius:18px;">
        <tr>
          <td style="padding:32px 32px 28px;font-family:Georgia,'Iowan Old Style',serif;color:#1c1915;">
            <p class="muted" style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5c564c;">${escapeHtml(brand.name)}</p>
            <p style="margin:0 0 16px;font-size:18px;line-height:1.45;">${escapeHtml(letter.opener)}</p>
            ${problems}
            <p style="margin:18px 0 8px;font-size:18px;line-height:1.4;"><strong>${escapeHtml(letter.frameworkName)}</strong></p>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.55;">${escapeHtml(letter.frameworkIntro)}</p>
            ${questions}
            ${sample}
            <p style="margin:18px 0 8px;font-size:18px;line-height:1.4;"><strong>Today: ${escapeHtml(letter.exampleTitle)}</strong></p>
            ${checks}
            <p style="margin:18px 0 18px;font-size:18px;line-height:1.45;"><strong>${escapeHtml(letter.takeaway)}</strong></p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td class="button" bgcolor="#1f6f5b" style="border-radius:999px;background:#1f6f5b;">
                  <a class="button" href="${escapeHtml(cta)}" style="display:inline-block;padding:12px 22px;font-family:Georgia,serif;font-size:16px;color:#ffffff;text-decoration:none;">${escapeHtml(letter.ctaLabel)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:22px 0 0;font-size:16px;line-height:1.55;">${signoff}</p>
            ${ps}
            <p class="muted" style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#5c564c;">
              <a href="${escapeHtml(options.unsubscribeUrl)}">Unsubscribe</a>
              · <a href="${escapeHtml(options.preferencesUrl)}">Email preferences</a><br>
              ${escapeHtml(brand.address)} · <a href="${escapeHtml(brand.website)}">${escapeHtml(brand.website)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
