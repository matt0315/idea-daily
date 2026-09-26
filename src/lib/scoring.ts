export const CAPITAL_BANDS = ["none", "low", "medium", "high"] as const;
export type CapitalBand = (typeof CAPITAL_BANDS)[number];

export type ScoreInputs = {
  /** Monthly searches. 0 if unmeasured. */
  monthlyVolume: number;
  /** Percent points. 120 means +120%. */
  growthPct: number;
  competitorCount: number;
  painQuoteCount: number;
  /** Average severity from 1 (mild) to 5 (acute). */
  painSeverityAvg: number;
  buildWeeks: number;
  capitalBand: CapitalBand;
  /** 0 none, 3 heavy. */
  regulatoryLoad: number;
  /** 0 none, 3 blocked on a platform or licence. */
  dependencyRisk: number;
  /** Independent public timing signals, not a vibe score. */
  timingSignals: number;
};

export type ScoreBreakdown = {
  volume: number;
  growth: number;
  gap: number;
  quotes: number;
  severity: number;
  weeksPenalty: number;
  capitalPenalty: number;
  regulatoryPenalty: number;
  dependencyPenalty: number;
  signal: number;
};

export type ComputedScores = {
  opportunity: number;
  pain: number;
  buildability: number;
  timing: number;
  breakdown: ScoreBreakdown;
};

export type ScoreKind = "opportunity" | "pain" | "buildability" | "timing";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundScore(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return clamp(Math.round(n), 1, 10);
}

export function volumeComponent(monthlyVolume: number): number {
  if (monthlyVolume <= 0) return 1;
  const decades = Math.log10(monthlyVolume);
  return clamp((decades - 1.5) * 2.2, 1, 10);
}

export function growthComponent(growthPct: number): number {
  if (growthPct <= 0) return clamp(3 + growthPct / 25, 1, 3);
  return clamp(3 + Math.log2(1 + growthPct / 20) * 2.2, 1, 10);
}

export function gapComponent(competitorCount: number): number {
  const n = Math.max(0, competitorCount);
  return clamp(9.5 - n * 0.7, 1, 10);
}

export function quoteComponent(count: number): number {
  if (count <= 0) return 2;
  return clamp(2 + Math.log2(count + 1) * 2.1, 1, 10);
}

export function severityComponent(avg: number): number {
  return clamp(avg * 2, 1, 10);
}

const CAPITAL_PENALTY: Record<CapitalBand, number> = {
  none: 0,
  low: 0.8,
  medium: 2.2,
  high: 4,
};

export function weeksPenalty(buildWeeks: number): number {
  if (buildWeeks <= 2) return 0;
  if (buildWeeks <= 4) return 1;
  if (buildWeeks <= 8) return 2.5;
  if (buildWeeks <= 12) return 4;
  return 5.5;
}

export function computeScores(input: ScoreInputs): ComputedScores {
  const volume = volumeComponent(input.monthlyVolume);
  const growth = growthComponent(input.growthPct);
  const gap = gapComponent(input.competitorCount);
  const opportunity = roundScore(volume * 0.4 + growth * 0.35 + gap * 0.25);

  const quotes = quoteComponent(input.painQuoteCount);
  const severity = severityComponent(input.painSeverityAvg);
  const pain = roundScore(quotes * 0.6 + severity * 0.4);

  const wPenalty = weeksPenalty(input.buildWeeks);
  const capitalPenalty = CAPITAL_PENALTY[input.capitalBand];
  const regulatoryPenalty = clamp(input.regulatoryLoad, 0, 3) * 1.1;
  const dependencyPenalty = clamp(input.dependencyRisk, 0, 3) * 0.7;
  const buildability = roundScore(10 - wPenalty - capitalPenalty - regulatoryPenalty - dependencyPenalty);

  const signal = clamp(2 + Math.max(0, input.timingSignals) * 1.4, 1, 10);
  const timing = roundScore(growth * 0.55 + signal * 0.45);

  return {
    opportunity,
    pain,
    buildability,
    timing,
    breakdown: {
      volume,
      growth,
      gap,
      quotes,
      severity,
      weeksPenalty: wPenalty,
      capitalPenalty,
      regulatoryPenalty,
      dependencyPenalty,
      signal,
    },
  };
}

const LABELS: Record<ScoreKind, string[]> = {
  opportunity: ["Narrow", "Narrow", "Narrow", "Modest", "Modest", "Solid", "Solid", "Strong", "Strong", "Exceptional"],
  pain: ["Mild", "Mild", "Mild", "Noticeable", "Noticeable", "Real pain", "Real pain", "Severe", "Severe", "Acute"],
  buildability: ["Heavy lift", "Heavy lift", "Heavy lift", "Demanding", "Demanding", "Doable", "Doable", "Manageable", "Manageable", "Weekend-scale"],
  timing: ["Stale window", "Stale window", "Stale window", "Mixed", "Mixed", "Favorable", "Favorable", "Great timing", "Great timing", "Window open"],
};

export function scoreLabel(kind: ScoreKind, value: number): string {
  const index = clamp(Math.round(value), 1, 10) - 1;
  return LABELS[kind][index];
}

/** 1 = lightest build, 10 = heaviest. Inverse of the buildability score. */
export function executionDifficulty(buildability: number): number {
  return clamp(11 - Math.round(buildability), 1, 10);
}

export type RoastVerdict = "Build" | "Pivot" | "Skip";
export type ResearchVerdict = "Build" | "Test-first" | "Pass";

export function roastVerdict(scores: Pick<ComputedScores, "opportunity" | "pain" | "buildability">): RoastVerdict {
  if (scores.opportunity <= 4 || scores.pain <= 4) return "Skip";
  if (scores.opportunity >= 7 && scores.pain >= 7 && scores.buildability >= 6) return "Build";
  return "Pivot";
}

export function researchVerdict(scores: Pick<ComputedScores, "opportunity" | "pain" | "buildability">): ResearchVerdict {
  if (scores.opportunity >= 7 && scores.pain >= 7 && scores.buildability >= 6) return "Build";
  if (scores.opportunity >= 5 && scores.pain >= 5) return "Test-first";
  return "Pass";
}

export function verdictConfidence(scores: Pick<ComputedScores, "opportunity" | "pain" | "buildability" | "timing">): number {
  const values = [scores.opportunity, scores.pain, scores.buildability, scores.timing];
  const spread = Math.max(...values) - Math.min(...values);
  const base = 55 + Math.round((10 - spread) * 3);
  return clamp(base, 40, 90);
}
