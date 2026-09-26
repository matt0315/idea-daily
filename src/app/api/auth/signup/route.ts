import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");
  const name = String(form.get("name") || "").trim();
  if (!email.includes("@") || password.length < 8) return redirectTo(request, "/signup");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return redirectTo(request, "/login?error=1");
  const user = await db.user.create({
    data: { email, name: name || null, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  return redirectTo(request, "/fit");
}
