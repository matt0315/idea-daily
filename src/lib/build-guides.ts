export const BUILD_TOOLS = [
  { id: "claude-code", name: "Claude Code", blurb: "CLAUDE.md, milestone tasks, and a starter layout." },
  { id: "cursor", name: "Cursor", blurb: "Project rules plus a PRD the agent can follow." },
  { id: "google-ai-studio", name: "Google AI Studio", blurb: "One-shot Build mode prompt and two follow-ups." },
  { id: "lovable", name: "Lovable", blurb: "Project brief, first prompt, and a Supabase schema prompt." },
  { id: "bolt", name: "Bolt", blurb: "A scaffold prompt, then one prompt per feature." },
  { id: "replit", name: "Replit", blurb: "Agent brief with deploy and database steps." },
  { id: "v0", name: "v0", blurb: "UI-first prompts for the marketing page and the app shell." },
  { id: "chatgpt-codex", name: "ChatGPT / Codex", blurb: "PRD plus a task list you can paste into Codex." },
] as const;

export type BuildToolId = (typeof BUILD_TOOLS)[number]["id"];

export type BuildBrief = {
  title: string;
  slug: string;
  oneLiner: string;
  customer: string;
  problem: string;
  mvp: string[];
  stack: string;
  pricing: string;
  outOfScope: string[];
};

export type GuideFile = { path: string; content: string };

export type BuildGuide = {
  tool: BuildToolId;
  name: string;
  blurb: string;
  files: GuideFile[];
  prompt: string;
};

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function prd(brief: BuildBrief): string {
  return `# ${brief.title} — product brief

${brief.oneLiner}

## Customer
${brief.customer}

## Problem
${brief.problem}

## MVP
${list(brief.mvp)}

## Stack
${brief.stack}

## Pricing note
${brief.pricing}

## Out of scope
${list(brief.outOfScope)}

## Rules
- Do not invent market statistics. If a number is not in this brief, leave it out.
- Ship the MVP list before any extra feature.
- Keep copy specific to ${brief.customer}.
`;
}

export function guidesForBrief(brief: BuildBrief): BuildGuide[] {
  const product = prd(brief);
  const milestones = brief.mvp.map((item, index) => `${index + 1}. ${item}`).join("\n");

  const claude = `# ${brief.title}

${brief.oneLiner}

## Product
${brief.problem}

Customer: ${brief.customer}

## Stack
${brief.stack}

## Conventions
- TypeScript, small modules, no speculative features.
- Every user-facing number needs a source already in the brief. Do not fabricate metrics.
- Prefer a working vertical slice over a framework.

## Milestones
${milestones}

## First session
Read this file, scaffold the app, and implement milestone 1 only. Stop and summarise before milestone 2.

## Suggested connectors
- Stripe for the deposit step, only after the artifact exists.
- Postgres for the records the MVP stores.
`;

  const cursorRules = `---
description: Product rules for ${brief.title}
globs: ["**/*"]
---

# ${brief.title}

${brief.oneLiner}

Customer: ${brief.customer}

Build only these slices, in order:
${milestones}

Stack: ${brief.stack}

Never add items from the out-of-scope list:
${list(brief.outOfScope)}

Do not invent statistics, testimonials, or logos.
`;

  const aiStudio = `Build a single-purpose web app called ${brief.title}.

${brief.oneLiner}

The user is ${brief.customer}. The job to finish: ${brief.problem}.

Screens:
${milestones}

Use plain, specific labels. No dashboard chrome that the MVP does not need.
Pricing to show in the UI: ${brief.pricing}

After the first build, iterate in this order:
1. Empty and error states for each screen.
2. A deposit or checkout step only if milestone list includes payment.
`;

  const lovable = `Project: ${brief.title}
${brief.oneLiner}

Knowledge:
- Customer: ${brief.customer}
- Problem: ${brief.problem}
- Stack preference: ${brief.stack}

First prompt:
Create the app with these screens only:
${milestones}

Schema prompt (run second):
Propose a Postgres schema with the fewest tables that store the MVP. Include a Stripe customer id only if payment is in the MVP. Do not add chat, teams, or notifications tables.

Stripe step (run third, if payment is in scope):
Add a test-mode checkout for: ${brief.pricing}
`;

  const bolt = `Create ${brief.title}. ${brief.oneLiner}

Stack: ${brief.stack}
Customer: ${brief.customer}

Scaffold:
${milestones}

Then stop. Wait for the next feature prompt. Do not add authentication roles, blogs, or admin analytics.
`;

  const replit = `You are building ${brief.title} inside Replit.

${brief.oneLiner}
Customer: ${brief.customer}
Problem: ${brief.problem}

Steps:
1. Create a web app using ${brief.stack}.
2. Add a Postgres database (Replit DB only if Postgres is unavailable) with tables for the MVP records.
3. Implement:
${milestones}
4. Add a deploy button path and a README with the env vars you introduced.
5. Do not invent metrics in the UI.

Pricing copy, if a paywall is required: ${brief.pricing}
`;

  const v0 = `Design the marketing page for ${brief.title}.

Headline from this one-liner: ${brief.oneLiner}
Audience: ${brief.customer}
Problem paragraph: ${brief.problem}

Sections: hero, three steps (${brief.mvp.join("; ")}), pricing note (${brief.pricing}), FAQ with three questions a sceptical buyer would ask.

Visual direction: warm paper background, deep green accent, serif headline. No stock-photo hero, no fake logos.

Second prompt: the signed-in app shell with a list and a detail view for the first MVP step only.
`;

  const codex = `${product}

## Tasks
${milestones}

Implement task 1 and its tests before task 2. Ask before adding a dependency that is not implied by the stack line.
`;

  const files: Record<BuildToolId, GuideFile[]> = {
    "claude-code": [
      { path: "CLAUDE.md", content: claude },
      { path: "PRD.md", content: product },
      { path: "src/README.md", content: `# ${brief.title}\n\nStarter layout. Implement milestones from CLAUDE.md in order.\n` },
    ],
    cursor: [
      { path: ".cursor/rules/product.mdc", content: cursorRules },
      { path: "PRD.md", content: product },
    ],
    "google-ai-studio": [{ path: "AI_STUDIO_PROMPT.md", content: aiStudio }],
    lovable: [{ path: "LOVABLE.md", content: lovable }],
    bolt: [{ path: "BOLT.md", content: bolt }],
    replit: [{ path: "REPLIT.md", content: replit }],
    v0: [{ path: "V0.md", content: v0 }],
    "chatgpt-codex": [
      { path: "PRD.md", content: product },
      { path: "CODEX_TASKS.md", content: codex },
    ],
  };

  const prompts: Record<BuildToolId, string> = {
    "claude-code": claude,
    cursor: cursorRules,
    "google-ai-studio": aiStudio,
    lovable: lovable,
    bolt: bolt,
    replit: replit,
    v0: v0,
    "chatgpt-codex": codex,
  };

  return BUILD_TOOLS.map((tool) => ({
    tool: tool.id,
    name: tool.name,
    blurb: tool.blurb,
    files: files[tool.id],
    prompt: prompts[tool.id],
  }));
}

export function briefFromUnknown(value: unknown, fallbackTitle: string): BuildBrief {
  const record = (value && typeof value === "object" ? value : {}) as Partial<BuildBrief>;
  return {
    title: record.title || fallbackTitle,
    slug: record.slug || "idea",
    oneLiner: record.oneLiner || fallbackTitle,
    customer: record.customer || "A specific small operator, not a generic SMB.",
    problem: record.problem || "A repeated chore that is still done by hand.",
    mvp: Array.isArray(record.mvp) && record.mvp.length > 0 ? record.mvp.map(String) : ["Capture inputs", "Produce one artifact"],
    stack: record.stack || "Next.js, Postgres, Stripe",
    pricing: record.pricing || "Set the price after interviews.",
    outOfScope: Array.isArray(record.outOfScope) ? record.outOfScope.map(String) : ["Marketplace", "Native apps"],
  };
}
