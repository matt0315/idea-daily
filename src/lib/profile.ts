import { z } from "zod";
import type { FounderProfile } from "./founder-fit";

export const founderProfileSchema = z.object({
  skills: z.object({
    tech: z.number().min(0).max(5),
    sales: z.number().min(0).max(5),
    design: z.number().min(0).max(5),
    domain: z.number().min(0).max(5),
  }),
  weeklyHours: z.number().min(1).max(80),
  capitalBand: z.enum(["none", "low", "medium", "high"]),
  riskTolerance: z.enum(["low", "medium", "high"]),
  model: z.enum(["b2b", "b2c", "either"]),
  motion: z.enum(["saas", "service", "either"]),
  industries: z.array(z.string()).max(12),
  location: z.string().max(80),
});

export function readProfile(value: unknown): FounderProfile | null {
  const parsed = founderProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
