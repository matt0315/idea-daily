import type { CapitalBand } from "./scoring";

export type SkillKey = "tech" | "sales" | "design" | "domain";

export type FounderProfile = {
  skills: Record<SkillKey, number>;
  weeklyHours: number;
  capitalBand: CapitalBand;
  riskTolerance: "low" | "medium" | "high";
  model: "b2b" | "b2c" | "either";
  motion: "saas" | "service" | "either";
  industries: string[];
  location: string;
};

export type IdeaRequirements = {
  skills: Record<SkillKey, number>;
  weeklyHours: number;
  capitalBand: CapitalBand;
  risk: "low" | "medium" | "high";
  model: "b2b" | "b2c" | "both";
  motion: "saas" | "service" | "either";
  industries: string[];
  mvpWeeks: number;
  salesIntensity: number;
  regulatoryLoad: number;
};

export type FitReason = {
  factor: string;
  impact: "helps" | "hurts" | "neutral";
  text: string;
};

export type FitResult = {
  percent: number;
  label: string;
  reasons: FitReason[];
  changes: string[];
  archetype: string;
};

const CAPITAL_ORDER: Record<CapitalBand, number> = { none: 0, low: 1, medium: 2, high: 3 };

const ARCHETYPES = [
  "Systems Builder",
  "Distribution First",
  "Domain Operator",
  "Studio Maker",
  "Lean Tester",
  "Full-time Founder",
] as const;

export type ArchetypeName = (typeof ARCHETYPES)[number];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function skillMatch(have: number, need: number): number {
  if (need <= 0) return 1;
  return clamp(have / need, 0, 1);
}

export function founderArchetype(profile: FounderProfile): ArchetypeName {
  const { tech, sales, design, domain } = profile.skills;
  const ranked: { name: ArchetypeName; score: number }[] = [
    { name: "Systems Builder", score: tech * 2 + (profile.weeklyHours >= 20 ? 1 : 0) },
    { name: "Distribution First", score: sales * 2 + (profile.motion === "service" ? 0.5 : 0) },
    { name: "Domain Operator", score: domain * 2 + (profile.industries.length > 0 ? 1 : 0) },
    { name: "Studio Maker", score: design * 2 },
    {
      name: "Lean Tester",
      score:
        (profile.capitalBand === "none" || profile.capitalBand === "low" ? 3 : 0) +
        (profile.riskTolerance === "low" ? 2 : 0) +
        (profile.weeklyHours <= 15 ? 2 : 0),
    },
    {
      name: "Full-time Founder",
      score:
        (profile.weeklyHours >= 30 ? 4 : 0) +
        (profile.riskTolerance === "high" ? 2 : 0) +
        (profile.capitalBand === "medium" || profile.capitalBand === "high" ? 1 : 0),
    },
  ];
  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return ranked[0].name;
}

const SKILL_LABEL: Record<SkillKey, string> = {
  tech: "technical",
  sales: "sales",
  design: "design",
  domain: "domain",
};

export function founderFit(profile: FounderProfile, req: IdeaRequirements): FitResult {
  const keys: SkillKey[] = ["tech", "sales", "design", "domain"];
  const skills = keys.reduce((sum, key) => sum + skillMatch(profile.skills[key], req.skills[key]), 0) / keys.length;
  const hours = req.weeklyHours <= 0 ? 1 : clamp(profile.weeklyHours / req.weeklyHours, 0, 1);
  const haveCapital = CAPITAL_ORDER[profile.capitalBand];
  const needCapital = CAPITAL_ORDER[req.capitalBand];
  const capital = haveCapital >= needCapital ? 1 : needCapital === 0 ? 1 : haveCapital / needCapital;
  const model =
    profile.model === "either" || req.model === "both" || profile.model === req.model ? 1 : 0.35;
  const motion =
    profile.motion === "either" || req.motion === "either" || profile.motion === req.motion ? 1 : 0.4;
  const wanted = req.industries.map((item) => item.toLowerCase());
  const known = new Set(profile.industries.map((item) => item.toLowerCase()));
  const overlap = wanted.length === 0 ? 0.7 : wanted.some((item) => known.has(item)) ? 1 : 0.45;
  const riskFit =
    req.regulatoryLoad >= 2
      ? profile.riskTolerance === "high"
        ? 1
        : profile.riskTolerance === "medium"
          ? 0.6
          : 0.3
      : profile.riskTolerance === "low"
        ? 1
        : 0.85;

  const weighted =
    skills * 0.35 + hours * 0.15 + capital * 0.15 + model * 0.15 + motion * 0.08 + overlap * 0.07 + riskFit * 0.05;
  const percent = Math.round(100 * clamp(weighted, 0, 1));

  const reasons: FitReason[] = [];
  for (const key of keys) {
    if (req.skills[key] >= 3 && profile.skills[key] >= req.skills[key]) {
      reasons.push({
        factor: key,
        impact: "helps",
        text: `Your ${SKILL_LABEL[key]} skill (${profile.skills[key]}/5) covers the ${req.skills[key]}/5 this idea asks for.`,
      });
    } else if (req.skills[key] >= 3 && profile.skills[key] < req.skills[key]) {
      reasons.push({
        factor: key,
        impact: "hurts",
        text: `This idea wants ${SKILL_LABEL[key]} skill at ${req.skills[key]}/5. Your profile says ${profile.skills[key]}/5.`,
      });
    }
  }
  if (profile.weeklyHours >= req.weeklyHours) {
    reasons.push({
      factor: "hours",
      impact: "helps",
      text: `${profile.weeklyHours} hours a week covers the ${req.weeklyHours}-hour pace written into this idea.`,
    });
  } else {
    reasons.push({
      factor: "hours",
      impact: "hurts",
      text: `The MVP pace assumes ${req.weeklyHours} hours a week. Your profile has ${profile.weeklyHours}.`,
    });
  }
  if (haveCapital >= needCapital) {
    reasons.push({
      factor: "capital",
      impact: "helps",
      text: `Your capital band (${profile.capitalBand}) covers the ${req.capitalBand} band on this idea.`,
    });
  } else {
    reasons.push({
      factor: "capital",
      impact: "hurts",
      text: `This idea sits in the ${req.capitalBand} capital band. Yours is ${profile.capitalBand}.`,
    });
  }
  reasons.push({
    factor: "model",
    impact: model < 1 ? "hurts" : "helps",
    text:
      model < 1
        ? `You prefer ${profile.model.toUpperCase()} and this idea is aimed at ${req.model.toUpperCase()}.`
        : `Market type lines up with your preference (${req.model === "both" ? "either market" : req.model.toUpperCase()}).`,
  });

  const changes: string[] = [];
  if (hours < 1) {
    changes.push(`Free up closer to ${req.weeklyHours} hours a week, or shrink the first version to a concierge offer.`);
  }
  if (capital < 1) {
    changes.push(`Keep the first version inside the ${profile.capitalBand} capital band: manual delivery, no custom hardware.`);
  }
  for (const key of keys) {
    if (req.skills[key] - profile.skills[key] >= 2) {
      changes.push(`Close the ${SKILL_LABEL[key]} gap with a specialist, or pick a stack that removes that work.`);
    }
  }
  if (model < 1) {
    changes.push(`Rewrite the buyer so the offer matches ${profile.model.toUpperCase()}, or choose a different idea.`);
  }
  if (changes.length === 0) {
    changes.push("Nothing structural to change. Start with five customer interviews before you write product code.");
  }

  const label = percent >= 80 ? "Strong match" : percent >= 60 ? "Workable match" : percent >= 40 ? "Stretch" : "Poor fit";

  return {
    percent,
    label,
    reasons,
    changes,
    archetype: founderArchetype(profile),
  };
}

export function fitSortValue(profile: FounderProfile | null, req: IdeaRequirements): number | null {
  if (!profile) return null;
  return founderFit(profile, req).percent;
}
