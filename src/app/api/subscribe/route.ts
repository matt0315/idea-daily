import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").toLowerCase().trim();
  if (email.includes("@")) {
    await db.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  }
  return redirectTo(request, "/?subscribed=1");
}
