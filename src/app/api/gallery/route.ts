import { getCurrentUser } from "@/lib/auth";
import { BUILD_TOOLS } from "@/lib/build-guides";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const form = await request.formData();
  const tool = String(form.get("tool") || "");
  if (!user) return redirectTo(request, `/login?next=/built-with/${tool}`);
  if (!BUILD_TOOLS.some((item) => item.id === tool)) return redirectTo(request, "/built-with");
  const title = String(form.get("title") || "").trim();
  const url = String(form.get("url") || "").trim();
  const blurb = String(form.get("blurb") || "").trim();
  const makerName = String(form.get("makerName") || "").trim();
  const ideaSlug = String(form.get("ideaSlug") || "");
  if (!title || !url.startsWith("http") || !blurb || !makerName) return redirectTo(request, `/built-with/${tool}`);
  const idea = ideaSlug ? await db.idea.findUnique({ where: { slug: ideaSlug } }) : null;
  await db.galleryItem.create({
    data: {
      tool,
      title,
      url,
      blurb,
      makerName,
      userId: user.id,
      ideaId: idea?.id,
      status: "pending",
      dataMode: "LIVE",
    },
  });
  return redirectTo(request, `/built-with/${tool}?submitted=1`);
}
