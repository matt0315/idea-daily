import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";
import { publishIdea } from "@/lib/publish";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const { id } = await context.params;
  const form = await request.formData();
  const action = String(form.get("action") || "");
  if (action === "approve") await db.idea.update({ where: { id }, data: { status: "APPROVED" } });
  if (action === "reject") await db.idea.update({ where: { id }, data: { status: "REJECTED" } });
  if (action === "publish") await publishIdea(id);
  return redirectTo(request, "/admin");
}
