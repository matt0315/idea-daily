import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/account");
  if (asPlan(user.plan) !== "PRO") return redirectTo(request, "/account");
  const form = await request.formData();
  const optOut = String(form.get("optOut") || "") === "yes";
  await db.user.update({ where: { id: user.id }, data: { communityReleaseOptOut: optOut } });
  return redirectTo(request, "/account");
}
