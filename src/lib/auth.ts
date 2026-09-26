import { cookies } from "next/headers";
import { db } from "./db";
import type { Plan } from "./gating";
import type { User } from "@prisma/client";

export const SESSION_COOKIE = "ideadaily_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS * 1000);
  await db.session.create({ data: { userId, token, expiresAt } });
  await setSessionCookie(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.user;
}

export function asPlan(value: string): Plan {
  if (value === "BUILDER" || value === "PRO") return value;
  return "FREE";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}
