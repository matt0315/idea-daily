import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/account");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return redirectTo(request, `/login?error=1&next=${encodeURIComponent(safeNext)}`);
  }
  await createSession(user.id);
  return redirectTo(request, safeNext);
}
