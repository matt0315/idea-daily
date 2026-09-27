export type Plan = "FREE" | "BUILDER" | "PRO";

export const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  BUILDER: 1,
  PRO: 2,
};

export type Feature =
  | "database"
  | "trends.full"
  | "insights.full"
  | "generate"
  | "founderFit"
  | "buildGuides.all"
  | "exports"
  | "advisor"
  | "research"
  | "buildHub"
  | "trends.research"
  | "alphabet";

const MIN_PLAN: Record<Feature, Plan> = {
  database: "BUILDER",
  "trends.full": "BUILDER",
  "insights.full": "BUILDER",
  generate: "BUILDER",
  founderFit: "BUILDER",
  "buildGuides.all": "BUILDER",
  exports: "BUILDER",
  advisor: "BUILDER",
  research: "PRO",
  buildHub: "PRO",
  "trends.research": "BUILDER",
  alphabet: "BUILDER",
};

export function canAccess(plan: Plan, feature: Feature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[MIN_PLAN[feature]];
}

export function requiredPlan(feature: Feature): Plan {
  return MIN_PLAN[feature];
}

export type Meter = "research" | "advisor" | "trendResearch" | "generate" | "alphabet";

/** Monthly quotas. Research is counted per calendar month on Pro (5). Alphabet Demand is a mine run, not a page view. */
export const QUOTAS: Record<Plan, Record<Meter, number>> = {
  FREE: { research: 0, advisor: 0, trendResearch: 0, generate: 0, alphabet: 0 },
  BUILDER: { research: 0, advisor: 20, trendResearch: 10, generate: 20, alphabet: 5 },
  PRO: { research: 5, advisor: 150, trendResearch: 50, generate: 100, alphabet: 30 },
};

export function quotaFor(plan: Plan, meter: Meter): number {
  return QUOTAS[plan][meter];
}

export function remaining(plan: Plan, meter: Meter, used: number): number {
  return Math.max(0, quotaFor(plan, meter) - Math.max(0, used));
}

export function canConsume(plan: Plan, meter: Meter, used: number): boolean {
  return remaining(plan, meter, used) > 0;
}

export const FREE_ARCHIVE_DAYS = 7;

export function isWithinFreeArchive(publishedAt: Date, now: Date): boolean {
  const windowMs = FREE_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - publishedAt.getTime() <= windowMs && now.getTime() >= publishedAt.getTime();
}

export const PRICES = {
  FREE: { monthlyCents: 0, annualCents: 0, monthlyLabel: "$0", annualLabel: "$0" },
  BUILDER: { monthlyCents: 1900, annualCents: 14900, monthlyLabel: "$19", annualLabel: "$149" },
  PRO: { monthlyCents: 4900, annualCents: 39900, monthlyLabel: "$49", annualLabel: "$399" },
} as const;

/** The one build-guide tab a free account can open. */
export const FREE_GUIDE_TOOL = "cursor";

export function guideAllowed(plan: Plan, toolId: string): boolean {
  if (canAccess(plan, "buildGuides.all")) return true;
  return toolId === FREE_GUIDE_TOOL;
}

export const TREND_TEASER_LIMIT = 8;
export const INSIGHT_TEASER_LIMIT = 1;

export function planLabel(plan: Plan): string {
  if (plan === "FREE") return "Free";
  if (plan === "BUILDER") return "Builder";
  return "Pro";
}
