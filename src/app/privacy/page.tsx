import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { releaseDelayDays } from "@/lib/community/settings";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const days = await releaseDelayDays(db);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Privacy</h1>
      <p className="mt-4 text-muted">{brand.name} keeps Alphabet Demand mines, Idea Agent runs, and trends research on your account for {days} days.</p>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>During that window only you can open the result. A shared cache may reuse the phrases, competitor URLs, or keyword rows for the same niche, description, or seed so the provider is not called again. The cache does not store your name, email, or project titles, and a cache hit does not spend one of your monthly credits.</p>
        <p>After {days} days the result can be copied into the admin review queue. That public copy is tagged “community mine” and dated with the original run. It does not include your user id, name, email, project names, founder profile, or private notes. If the same niche and cluster, or a very similar title, is already in the database, the new phrases are merged into that idea instead of creating another one.</p>
        <p>Nothing from this queue is published until a person approves it. Pro accounts can opt out of the public copy from the account page. The opt-out applies to runs that have not been released yet. Builder and Free accounts cannot opt out. An administrator can change the {days}-day delay.</p>
        <p>Sample phrases, when a provider key is missing, are templates. They are labelled sample data and are not presented as live searches.</p>
      </div>
    </div>
  );
}
