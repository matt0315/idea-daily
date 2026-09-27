import Link from "next/link";
import { db } from "@/lib/db";
import { releaseDelayDays } from "@/lib/community/settings";

export async function CommunityNotice() {
  const days = await releaseDelayDays(db);
  return (
    <p className="mt-3 text-sm text-muted">
      Your search stays private on your account for {days} days. After that it is anonymised — no name, email, user id, or project title — and may enter the public review queue as a community mine. A repeated niche inside that window is served from the shared cache and does not use a credit. Pro accounts can opt out on the <Link className="underline" href="/account">account page</Link>. <Link className="underline" href="/privacy">Privacy</Link>
    </p>
  );
}
