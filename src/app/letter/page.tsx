import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { isLetterContent } from "@/lib/letter";

export const metadata: Metadata = { title: "Letter", description: `Past daily letters from ${brand.name}.` };

export default async function LetterArchivePage() {
  const issues = await db.newsletterIssue.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{brand.name}</p>
      <h1 className="mt-2 font-serif text-5xl">The daily letter</h1>
      <p className="mt-3 text-muted">One idea, four questions, and a single thing to do next. The archive is the same letter that goes out by email.</p>
      <ul className="mt-8 divide-y divide-line rounded-3xl border border-line bg-card">
        {issues.map((issue) => {
          const content = isLetterContent(issue.content) ? issue.content : null;
          const day = issue.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
          return (
            <li key={issue.id}>
              <Link href={`/letter/${issue.slug}`} className="block px-4 py-4 hover:bg-paper">
                <p className="text-xs uppercase tracking-wide text-muted">{day}</p>
                <h2 className="font-serif text-2xl">{content?.ideaTitle || issue.subject}</h2>
                <p className="mt-1 text-sm text-muted">{content?.opener}</p>
              </Link>
            </li>
          );
        })}
        {issues.length === 0 ? <li className="px-4 py-6 text-sm text-muted">No letters yet. The first one is written when an idea is published.</li> : null}
      </ul>
    </div>
  );
}
