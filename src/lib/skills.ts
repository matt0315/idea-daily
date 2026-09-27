import type { BuildBrief } from "./build-guides";

export const SKILLS = [
  { id: "offer", name: "Offer" },
  { id: "voice", name: "Brand voice" },
  { id: "landing", name: "Landing page copy" },
  { id: "email", name: "Email sequence" },
  { id: "ship", name: "7-day ship plan" },
  { id: "run-all", name: "Run all" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];

export type SkillContext = {
  brief: BuildBrief;
  founderName?: string;
  archetype?: string;
  weeklyHours?: number;
};

function offer(ctx: SkillContext): string {
  return `# Offer — ${ctx.brief.title}

## Who it is for
${ctx.brief.customer}

## The job
${ctx.brief.problem}

## Promise
${ctx.brief.oneLiner}

## Ladder
1. **Free:** a checklist the buyer can use this week without an account.
2. **Paid service:** you deliver the same artifact by hand. Price comes from interviews, not from this template. Current note: ${ctx.brief.pricing}
3. **Software:** the repeated steps only. MVP scope:
${ctx.brief.mvp.map((item) => `   - ${item}`).join("\n")}

## Not included
${ctx.brief.outOfScope.map((item) => `- ${item}`).join("\n")}
`;
}

function voice(ctx: SkillContext): string {
  return `# Brand voice — ${ctx.brief.title}

Write like a careful operator, not a launch-thread account.

- Second person, short sentences, concrete nouns from this customer: ${ctx.brief.customer}.
- Name the artifact the product produces. Do not say "unlock", "seamless", or "supercharge".
- Never invent a customer count, a revenue figure, or a quote.
- If a number is missing, say what you would measure.

One-line voice test: could ${ctx.brief.customer} forward the sentence to a colleague without being embarrassed?
`;
}

function landing(ctx: SkillContext): string {
  return `# Landing page — ${ctx.brief.title}

## Headline
${ctx.brief.oneLiner}

## Subhead
Built for ${ctx.brief.customer}. ${ctx.brief.problem}

## Steps
${ctx.brief.mvp.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Proof slot
Leave this empty until you have a sourced quote. Do not use a placeholder testimonial.

## Price
${ctx.brief.pricing}

## FAQ
1. Who is this not for? Anyone outside: ${ctx.brief.customer}.
2. What will you not build? ${ctx.brief.outOfScope.join(", ")}.
3. What happens after signup? They complete step 1 of the MVP and receive the artifact.
`;
}

function email(ctx: SkillContext): string {
  return `# Email sequence — ${ctx.brief.title}

Four notes. No countdown timers. No invented scarcity.

1. **Day 0 — the checklist.** Subject: The ${ctx.brief.title} checklist. Body: send the free checklist and name the chore (${ctx.brief.problem}).
2. **Day 2 — the manual offer.** Subject: I can do the first one with you. Body: offer the done-for-you version. Price: ${ctx.brief.pricing}
3. **Day 5 — a specific objection.** Subject: What this does not do. Body: list out of scope (${ctx.brief.outOfScope.join("; ")}).
4. **Day 9 — one question.** Subject: Quick question. Body: ask what they use today. Do not pitch.
`;
}

function ship(ctx: SkillContext): string {
  const hours = ctx.weeklyHours ?? 15;
  return `# 7-day ship plan — ${ctx.brief.title}

Assumes about ${hours} hours this week${ctx.archetype ? ` (${ctx.archetype})` : ""}.

## MVP in
${ctx.brief.mvp.map((item) => `- ${item}`).join("\n")}

## Kill list
${ctx.brief.outOfScope.map((item) => `- ${item}`).join("\n")}
- Accounts for multiple roles
- A marketing site with a blog
- Analytics beyond a signup count

## Stack call
${ctx.brief.stack}. One repo. No microservices.

## Gates
- Gate A (day 2): one buyer describes the artifact in their own words.
- Gate B (day 5): one buyer accepts a manual version.
- Gate C (day 7): the software version produces the same artifact without you retyping it.

## Today
Write the exclusions list and book one conversation with ${ctx.brief.customer}.
`;
}

const WRITERS: Record<Exclude<SkillId, "run-all">, (ctx: SkillContext) => string> = {
  offer,
  voice,
  landing,
  email,
  ship,
};

export function runSkill(skill: SkillId, ctx: SkillContext): { markdown: string; skills: SkillId[] } {
  if (skill === "run-all") {
    const order: Exclude<SkillId, "run-all">[] = ["offer", "voice", "landing", "email", "ship"];
    const markdown = order.map((id) => WRITERS[id](ctx)).join("\n\n---\n\n");
    return { markdown, skills: ["run-all", ...order] };
  }
  return { markdown: WRITERS[skill](ctx), skills: [skill] };
}
