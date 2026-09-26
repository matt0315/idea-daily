import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const { id } = await context.params;
  const form = await request.formData();
  const status = String(form.get("status") || "");
  if (status === "approved" || status === "rejected") {
    await db.galleryItem.update({ where: { id }, data: { status } });
  }
  return redirectTo(request, "/admin");
}
