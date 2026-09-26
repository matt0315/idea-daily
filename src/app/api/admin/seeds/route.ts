import { getCurrentUser } from "@/lib/auth";
import { normalizeCountry, normalizeLanguage, normalizeNiche } from "@/lib/autocomplete/markets";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const form = await request.formData();
  const action = String(form.get("action") || "create");
  const id = String(form.get("id") || "");
  if (action === "delete" && id) {
    await db.autocompleteSeed.deleteMany({ where: { id } });
    return redirectTo(request, "/admin");
  }
  if (action === "toggle" && id) {
    const seed = await db.autocompleteSeed.findUnique({ where: { id } });
    if (seed) await db.autocompleteSeed.update({ where: { id }, data: { active: !seed.active } });
    return redirectTo(request, "/admin");
  }
  const niche = normalizeNiche(String(form.get("niche") || ""));
  if (niche.length < 2) return redirectTo(request, "/admin");
  const country = normalizeCountry(String(form.get("country") || "US"));
  const language = normalizeLanguage(String(form.get("language") || "en"));
  await db.autocompleteSeed.upsert({
    where: { niche_country: { niche, country } },
    create: { niche, country, language, active: true },
    update: { language, active: true },
  });
  return redirectTo(request, "/admin");
}
