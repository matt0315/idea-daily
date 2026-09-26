import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  await getCurrentUser();
  await clearSessionCookie();
  return redirectTo(request, "/");
}
