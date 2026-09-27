import type { PrismaClient } from "@prisma/client";
import { clampReleaseDays, DEFAULT_RELEASE_DAYS, RELEASE_SETTING_KEY } from "./policy";

export async function releaseDelayDays(db: PrismaClient): Promise<number> {
  const row = await db.appSetting.findUnique({ where: { key: RELEASE_SETTING_KEY } });
  if (!row) return DEFAULT_RELEASE_DAYS;
  return clampReleaseDays(Number(row.value));
}

export async function setReleaseDelayDays(db: PrismaClient, days: number): Promise<number> {
  const value = String(clampReleaseDays(days));
  await db.appSetting.upsert({
    where: { key: RELEASE_SETTING_KEY },
    create: { key: RELEASE_SETTING_KEY, value },
    update: { value },
  });
  return Number(value);
}
