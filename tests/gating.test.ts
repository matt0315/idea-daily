import { describe, expect, it } from "vitest";
import {
  canAccess,
  canConsume,
  FREE_GUIDE_TOOL,
  guideAllowed,
  isWithinFreeArchive,
  quotaFor,
  remaining,
} from "../src/lib/gating";

describe("plan gates", () => {
  it("keeps the database, generator, and founder fit on Builder and above", () => {
    expect(canAccess("FREE", "database")).toBe(false);
    expect(canAccess("BUILDER", "database")).toBe(true);
    expect(canAccess("FREE", "founderFit")).toBe(false);
    expect(canAccess("BUILDER", "generate")).toBe(true);
    expect(canAccess("PRO", "trends.full")).toBe(true);
  });

  it("keeps research and the build hub on Pro", () => {
    expect(canAccess("BUILDER", "research")).toBe(false);
    expect(canAccess("BUILDER", "buildHub")).toBe(false);
    expect(canAccess("PRO", "research")).toBe(true);
    expect(canAccess("PRO", "buildHub")).toBe(true);
  });

  it("lets Builder use the advisor with a smaller quota than Pro", () => {
    expect(canAccess("FREE", "advisor")).toBe(false);
    expect(quotaFor("BUILDER", "advisor")).toBe(20);
    expect(quotaFor("PRO", "advisor")).toBe(150);
    expect(canConsume("BUILDER", "advisor", 20)).toBe(false);
    expect(remaining("PRO", "research", 4)).toBe(1);
    expect(canConsume("BUILDER", "research", 0)).toBe(false);
    expect(quotaFor("BUILDER", "trendResearch")).toBe(10);
    expect(quotaFor("PRO", "trendResearch")).toBe(50);
  });

  it("opens one build guide on the free plan", () => {
    expect(guideAllowed("FREE", FREE_GUIDE_TOOL)).toBe(true);
    expect(guideAllowed("FREE", "claude-code")).toBe(false);
    expect(guideAllowed("BUILDER", "claude-code")).toBe(true);
  });

  it("treats a permalink older than seven days as outside the free archive window", () => {
    const now = new Date("2026-09-26T00:00:00Z");
    const recent = new Date("2026-09-22T00:00:00Z");
    const old = new Date("2026-08-01T00:00:00Z");
    expect(isWithinFreeArchive(recent, now)).toBe(true);
    expect(isWithinFreeArchive(old, now)).toBe(false);
  });
});
