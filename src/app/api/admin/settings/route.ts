import { getCurrentUser } from "@/lib/auth";
import { setReleaseDelayDays } from "@/lib/community/settings";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const form = await request.formData();
  const days = Number(form.get("days"));
  await setReleaseDelayDays(db, days);
  return redirectTo(request, "/admin");
}
