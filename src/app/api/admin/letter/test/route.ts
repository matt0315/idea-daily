import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";
import { sendTestLetter } from "@/lib/newsletter";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const form = await request.formData();
  const slug = String(form.get("slug") || "");
  const issue = await db.newsletterIssue.findUnique({ where: { slug } });
  if (!issue) return redirectTo(request, "/admin/letter?sent=missing");
  const result = await sendTestLetter(issue.id, user.email);
  const sent = result === "sent" ? "ok" : result === "missing" ? "missing" : "stub";
  return redirectTo(request, `/admin/letter?slug=${encodeURIComponent(slug)}&sent=${sent}`);
}
