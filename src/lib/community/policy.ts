import type { Plan } from "../gating";

/** Private window and shared-cache window. Admin can change it. */
export const DEFAULT_RELEASE_DAYS = 7;
export const RELEASE_SETTING_KEY = "communityReleaseDays";
export const COMMUNITY_SOURCE = "community mine";
export const DAY_MS = 24 * 60 * 60 * 1000;

export function clampReleaseDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RELEASE_DAYS;
  return Math.min(90, Math.max(1, Math.floor(value)));
}

/** Due once the private window has fully elapsed. The exact boundary is included. */
export function isDueForRelease(createdAt: Date, now: Date, delayDays: number): boolean {
  return now.getTime() - createdAt.getTime() >= clampReleaseDays(delayDays) * DAY_MS;
}

/** Fresh while the window has not elapsed. The exact boundary is a miss. */
export function isCacheFresh(fetchedAt: Date, now: Date, windowDays: number): boolean {
  return now.getTime() - fetchedAt.getTime() < clampReleaseDays(windowDays) * DAY_MS;
}

/**
 * A shared-cache hit does not call DataForSEO or a model, so it costs no monthly credit.
 * A miss costs one credit. Half credits are not used; the ledger only stores whole runs.
 */
export function meterCost(cacheHit: boolean): 0 | 1 {
  return cacheHit ? 0 : 1;
}

export function sharedCacheKey(parts: string[]): string {
  return parts
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("|");
}

/** Pro opt-out is honored. Other plans cannot suppress the public release. */
export function releaseAllowed(plan: Plan, optOut: boolean): boolean {
  if (plan === "PRO" && optOut) return false;
  return true;
}

export function shouldRelease(input: {
  createdAt: Date;
  releasedAt: Date | null;
  plan: Plan;
  optOut: boolean;
}, now: Date, delayDays: number): boolean {
  if (input.releasedAt) return false;
  if (!releaseAllowed(input.plan, input.optOut)) return false;
  return isDueForRelease(input.createdAt, now, delayDays);
}
