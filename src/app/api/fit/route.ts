import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { founderProfileSchema } from "@/lib/profile";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = founderProfileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the quiz answers." }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { founderProfile: parsed.data } });
  return NextResponse.json({ ok: true, archetypeReady: true });
}
