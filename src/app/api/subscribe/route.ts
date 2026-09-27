import { db } from "@/lib/db";
import { newEmailToken } from "@/lib/email-token";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").toLowerCase().trim();
  if (email.includes("@")) {
    await db.subscriber.upsert({
      where: { email },
      create: { email, token: newEmailToken() },
      update: { unsubscribedAt: null },
    });
  }
  return redirectTo(request, "/?subscribed=1");
}
