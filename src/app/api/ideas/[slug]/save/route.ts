import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  const { slug } = await context.params;
  if (!user) return redirectTo(request, `/login?next=/ideas/${slug}`);
  const idea = await db.idea.findUnique({ where: { slug } });
  if (!idea) return redirectTo(request, "/ideas");
  const existing = await db.savedIdea.findUnique({ where: { userId_ideaId: { userId: user.id, ideaId: idea.id } } });
  if (existing) await db.savedIdea.delete({ where: { userId_ideaId: { userId: user.id, ideaId: idea.id } } });
  else await db.savedIdea.create({ data: { userId: user.id, ideaId: idea.id } });
  return redirectTo(request, `/ideas/${slug}`);
}
