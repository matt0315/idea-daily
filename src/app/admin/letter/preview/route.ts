import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLetterContent } from "@/lib/letter";
import { previewHtml } from "@/lib/newsletter";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "";
  const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
  const issue = slug
    ? await db.newsletterIssue.findUnique({ where: { slug } })
    : await db.newsletterIssue.findFirst({ orderBy: { createdAt: "desc" } });
  if (!issue || !isLetterContent(issue.content)) return new Response("Missing letter", { status: 404 });
  return new Response(previewHtml(issue.content, theme), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
