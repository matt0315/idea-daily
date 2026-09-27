import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

async function turnOff(token: string) {
  if (!token) return;
  const user = await db.user.updateMany({ where: { emailToken: token }, data: { emailOptIn: false } });
  if (user.count > 0) return;
  await db.subscriber.updateMany({ where: { token }, data: { unsubscribedAt: new Date() } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  await turnOff(token);
  return redirectTo(request, "/letter/unsubscribed");
}

export async function POST(request: Request) {
  const form = await request.formData();
  await turnOff(String(form.get("token") || ""));
  return redirectTo(request, "/letter/unsubscribed");
}
