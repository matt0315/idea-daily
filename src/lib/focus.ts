import { brand } from "./brand";
import { llmConfigured, completeText } from "./llm";

export const FOCUS_KEYS = ["customer", "offer", "funnel", "channel"] as const;
export type FocusKey = (typeof FOCUS_KEYS)[number];

export const FOCUS_QUESTIONS: { key: FocusKey; label: string; question: string }[] = [
  {
    key: "customer",
    label: "One customer",
    question: "Name one person and the pain they already have. A market is not a person.",
  },
  {
    key: "offer",
    label: "One offer",
    question: "One thing removes that pain, and it has one price.",
  },
  {
    key: "funnel",
    label: "One funnel",
    question: "List the steps from “what is this?” to paid. Keep the path short.",
  },
  {
    key: "channel",
    label: "One channel",
    question: "Name one place these people already gather.",
  },
];

export type FocusFacts = {
  customer: string;
  pain: string;
  offer: string;
  price: string;
  funnel: string[];
  channel: string;
};

export type FocusCheck = {
  key: FocusKey;
  label: string;
  passed: boolean;
  evidence: string;
  rationale: string;
};

export type FocusChecklist = {
  name: string;
  checks: FocusCheck[];
  passedCount: number;
  verdict: "pass" | "needs-work";
  dataMode: "SAMPLE" | "LIVE";
};

const BARE_MARKET =
  /^(founders|startups|small businesses|consumers|users|everyone|the market|smbs?|businesses|restaurants|labs|shops|hotels)$/i;
const ROLE =
  /\b(owner|manager|founder|operator|technician|teacher|chef|farmer|director|buyer|lead|coordinator)\b/i;
const SPECIFIC =
  /\d|\b(shop|clinic|farm|hotel|studio|lab|restaurant|warehouse|city|metro|independent|residential|private|boutique)\b/i;
const GENERIC_CHANNEL =
  /^(social media|the internet|online|ads|everywhere|google|seo|content|content marketing)$/i;
const PLACE =
  /\b(forum|slack|subreddit|group|counter|newsletter|discord|meetup|association|wholesale|facebook|community|job board|trade school)\b/i;

function cleanSteps(steps: string[]): string[] {
  return steps.map((step) => step.trim()).filter(Boolean);
}

export function judgeCustomer(customer: string, pain: string): { passed: boolean; rationale: string } {
  const person = customer.trim();
  const ache = pain.trim();
  if (person.length < 12 || ache.length < 16 || BARE_MARKET.test(person)) {
    return { passed: false, rationale: "This names a market, not a person you could email." };
  }
  if (!ROLE.test(person) || !SPECIFIC.test(person)) {
    return { passed: false, rationale: "The person or the pain is too thin to recognise in one conversation." };
  }
  return { passed: true, rationale: "This names a person and a pain you could repeat back to them." };
}

export function judgeOffer(offer: string, price: string): { passed: boolean; rationale: string } {
  const thing = offer.trim();
  const cost = price.trim();
  if (thing.length < 12) return { passed: false, rationale: "The offer does not say what they buy." };
  if ((thing.match(/\band\b/gi) || []).length >= 2 || /\b(platform|suite|everything)\b/i.test(thing)) {
    return { passed: false, rationale: "This is more than one product." };
  }
  if (!/\d/.test(cost) || /\b(or|various|tbd|range)\b/i.test(cost)) {
    return { passed: false, rationale: "There is not a single price." };
  }
  return { passed: true, rationale: "One thing, one price, aimed at that pain." };
}

export function judgeFunnel(steps: string[]): { passed: boolean; rationale: string } {
  const clean = cleanSteps(steps);
  const first = clean[0]?.toLowerCase() ?? "";
  const last = clean[clean.length - 1]?.toLowerCase() ?? "";
  const opens = /\b(see|hear|land|visit|open|read|what|notice|arrive|click)\b/.test(first);
  const pays = /\b(pay|paid|deposit|buy|checkout|card|invoice|purchase)\b/.test(last);
  const sized = clean.length >= 3 && clean.length <= 6 && clean.every((step) => step.length >= 8);
  if (!opens || !pays || !sized) {
    return { passed: false, rationale: "The path is missing a first look, a payment, or a short list of steps." };
  }
  return { passed: true, rationale: "The path starts with a first look and ends with a payment." };
}

export function judgeChannel(channel: string): { passed: boolean; rationale: string } {
  const place = channel.trim();
  if (place.length < 8 || GENERIC_CHANNEL.test(place) || !PLACE.test(place)) {
    return { passed: false, rationale: "This is a medium, not a room they already sit in." };
  }
  return { passed: true, rationale: "One place these people already gather." };
}

export function scoreFocus(facts: FocusFacts, dataMode: "SAMPLE" | "LIVE" = "SAMPLE"): FocusChecklist {
  const customer = judgeCustomer(facts.customer, facts.pain);
  const offer = judgeOffer(facts.offer, facts.price);
  const funnel = judgeFunnel(facts.funnel);
  const channel = judgeChannel(facts.channel);
  const steps = cleanSteps(facts.funnel);
  const checks: FocusCheck[] = [
    {
      key: "customer",
      label: FOCUS_QUESTIONS[0].label,
      passed: customer.passed,
      evidence: `${facts.customer.trim()}. Pain: ${facts.pain.trim()}`.trim(),
      rationale: customer.rationale,
    },
    {
      key: "offer",
      label: FOCUS_QUESTIONS[1].label,
      passed: offer.passed,
      evidence: `${facts.offer.trim()} at ${facts.price.trim()}`.trim(),
      rationale: offer.rationale,
    },
    {
      key: "funnel",
      label: FOCUS_QUESTIONS[2].label,
      passed: funnel.passed,
      evidence: steps.join(" → "),
      rationale: funnel.rationale,
    },
    {
      key: "channel",
      label: FOCUS_QUESTIONS[3].label,
      passed: channel.passed,
      evidence: facts.channel.trim(),
      rationale: channel.rationale,
    },
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  return {
    name: brand.focusName,
    checks,
    passedCount,
    verdict: passedCount === 4 ? "pass" : "needs-work",
    dataMode,
  };
}

export function checklistFromIdeaFields(input: {
  title: string;
  summary: string;
  target?: string;
  offerDetail?: string;
  price?: string;
  channel?: string;
  executionPlan?: string;
}): FocusChecklist {
  const sentences = (input.executionPlan || "")
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8)
    .slice(0, 4);
  return scoreFocus(
    {
      customer: input.target?.trim() || input.summary,
      pain: input.summary,
      offer: input.offerDetail?.trim() || input.title,
      price: input.price?.trim() || "",
      funnel: sentences,
      channel: input.channel?.trim() || "",
    },
    "SAMPLE",
  );
}

export function isFocusChecklist(value: unknown): value is FocusChecklist {
  if (!value || typeof value !== "object") return false;
  const row = value as FocusChecklist;
  if (!Array.isArray(row.checks) || row.checks.length !== 4) return false;
  if (row.verdict !== "pass" && row.verdict !== "needs-work") return false;
  if (row.dataMode !== "SAMPLE" && row.dataMode !== "LIVE") return false;
  return row.checks.every((check, index) => check.key === FOCUS_KEYS[index] && typeof check.passed === "boolean" && typeof check.evidence === "string" && typeof check.rationale === "string");
}

export function readFocusChecklist(value: unknown): FocusChecklist | null {
  return isFocusChecklist(value) ? value : null;
}

const FOCUS_SYSTEM = `You score a startup idea with four yes-or-no checks: one customer, one offer, one funnel, one channel.
Return JSON only, with keys checks (array of four objects: key, passed, evidence, rationale).
Keys must be customer, offer, funnel, channel, in that order.
passed is boolean. evidence and rationale are short original sentences.
Do not invent a person who is not in the input. Do not use the label 1-1-1-1.`;

function parseModelChecks(text: string, facts: FocusFacts): FocusChecklist | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let body: { checks?: { key?: string; passed?: boolean; evidence?: string; rationale?: string }[] };
  try {
    body = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(body.checks) || body.checks.length !== 4) return null;
  const fallback = scoreFocus(facts, "LIVE");
  const checks = FOCUS_KEYS.map((key, index) => {
    const incoming = body.checks?.[index];
    const base = fallback.checks[index];
    if (!incoming || incoming.key !== key || typeof incoming.passed !== "boolean") return null;
    const evidence = String(incoming.evidence || "").trim();
    const rationale = String(incoming.rationale || "").trim();
    if (evidence.length < 12 || rationale.length < 12) return null;
    if (/1-1-1-1|vibe island/i.test(`${evidence} ${rationale}`)) return null;
    return { ...base, passed: incoming.passed, evidence, rationale };
  });
  if (checks.some((check) => !check)) return null;
  const ready = checks as FocusCheck[];
  const passedCount = ready.filter((check) => check.passed).length;
  return {
    name: brand.focusName,
    checks: ready,
    passedCount,
    verdict: passedCount === 4 ? "pass" : "needs-work",
    dataMode: "LIVE",
  };
}

/** Uses a model when a key is set. Otherwise the deterministic scorer, badged sample. */
export async function assessFocus(facts: FocusFacts): Promise<FocusChecklist> {
  const fallback = scoreFocus(facts, "SAMPLE");
  if (!llmConfigured()) return fallback;
  const result = await completeText(FOCUS_SYSTEM, JSON.stringify(facts));
  if (!result.ok) return fallback;
  return parseModelChecks(result.text, facts) ?? fallback;
}
