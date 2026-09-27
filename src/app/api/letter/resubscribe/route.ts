import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (token) {
    const user = await db.user.updateMany({ where: { emailToken: token }, data: { emailOptIn: true } });
    if (user.count === 0) {
      await db.subscriber.updateMany({ where: { token }, data: { unsubscribedAt: null } });
    }
  }
  return redirectTo(request, `/letter/preferences?token=${encodeURIComponent(token)}`);
}
