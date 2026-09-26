import type { Metadata } from "next";
import { IdeaReport } from "@/components/idea-report";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { loadPublishedIdea } from "@/lib/load-idea";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const idea = await db.idea.findUnique({ where: { slug } });
  if (!idea) return { title: "Idea" };
  return {
    title: idea.title,
    description: idea.summary,
    alternates: { canonical: `/ideas/${idea.slug}` },
    openGraph: { title: idea.title, description: idea.summary, type: "article" },
  };
}

export default async function IdeaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadPublishedIdea(slug);
  return (
    <>
      <p className="sr-only">{brand.name} idea report</p>
      <IdeaReport {...loaded} />
    </>
  );
}
