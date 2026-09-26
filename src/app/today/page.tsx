import type { Metadata } from "next";
import { IdeaReport } from "@/components/idea-report";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { loadPublishedIdea } from "@/lib/load-idea";

export const metadata: Metadata = { title: "Today", description: `The ${brand.name} idea of the day.` };

export default async function TodayPage() {
  const latest = await db.idea.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  if (!latest) return <p className="p-8">No idea has been published yet.</p>;
  const loaded = await loadPublishedIdea(latest.slug);
  return <IdeaReport {...loaded} />;
}
