import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/http";
import { runAutocompleteNightly } from "@/lib/autocomplete/nightly";
import { runDailyPipeline } from "@/lib/pipeline/run";
import { refreshTrends } from "@/lib/pipeline/trends-job";
import { publishNextApproved } from "@/lib/publish";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return redirectTo(request, "/");
  const form = await request.formData();
  const kind = String(form.get("kind") || "");
  if (kind === "daily") await runDailyPipeline(db);
  if (kind === "autocomplete") await runAutocompleteNightly(db);
  if (kind === "trends") await refreshTrends(db);
  if (kind === "publish") await publishNextApproved();
  return redirectTo(request, "/admin");
}
