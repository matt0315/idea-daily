import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assessFocus, type FocusFacts } from "@/lib/focus";
import { redirectTo } from "@/lib/http";

const MAX_DRAFTS = 4;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectTo(request, "/login?next=/fit");
  const form = await request.formData();
  if (String(form.get("action") || "") === "delete") {
    await db.focusDraft.deleteMany({ where: { id: String(form.get("id") || ""), userId: user.id } });
    return redirectTo(request, "/fit#focus-four");
  }
  const count = await db.focusDraft.count({ where: { userId: user.id } });
  if (count >= MAX_DRAFTS) return redirectTo(request, "/fit?focus=full#focus-four");
  const facts: FocusFacts = {
    customer: String(form.get("customer") || "").trim(),
    pain: String(form.get("pain") || "").trim(),
    offer: String(form.get("offer") || "").trim(),
    price: String(form.get("price") || "").trim(),
    funnel: String(form.get("funnel") || "").split(/\n+/),
    channel: String(form.get("channel") || "").trim(),
  };
  const title = String(form.get("title") || "").trim();
  if (title.length < 2 || facts.customer.length < 2 || facts.offer.length < 2) {
    return redirectTo(request, "/fit?focus=missing#focus-four");
  }
  const checklist = await assessFocus(facts);
  await db.focusDraft.create({
    data: {
      userId: user.id,
      title,
      facts,
      checklist,
      score: checklist.passedCount,
      dataMode: checklist.dataMode,
    },
  });
  return redirectTo(request, "/fit?focus=saved#focus-four");
}
