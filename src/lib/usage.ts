import { db } from "./db";
import { canConsume, remaining, type Meter, type Plan } from "./gating";

export function currentPeriod(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export async function meterUsed(userId: string, kind: Meter, now = new Date()): Promise<number> {
  const aggregate = await db.usageLedger.aggregate({
    where: { userId, kind, period: currentPeriod(now) },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

export async function consumeMeter(userId: string, plan: Plan, kind: Meter): Promise<{ ok: true; remaining: number } | { ok: false; remaining: number }> {
  const used = await meterUsed(userId, kind);
  if (!canConsume(plan, kind, used)) return { ok: false, remaining: 0 };
  await db.usageLedger.create({
    data: { userId, kind, period: currentPeriod(), amount: 1 },
  });
  return { ok: true, remaining: remaining(plan, kind, used + 1) };
}
