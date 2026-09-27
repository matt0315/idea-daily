import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/account");
  const form = await request.formData();
  const optIn = String(form.get("optIn") || "") === "yes";
  await db.user.update({ where: { id: user.id }, data: { emailOptIn: optIn } });
  return redirectTo(request, "/account");
}