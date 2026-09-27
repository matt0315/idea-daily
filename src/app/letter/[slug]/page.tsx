import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { isLetterContent } from "@/lib/letter";
import { SampleBadge } from "@/components/sample-badge";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = await db.newsletterIssue.findUnique({ where: { slug } });
  return { title: issue?.subject || "Letter" };
}

export default async function LetterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await db.newsletterIssue.findUnique({ where: { slug } });
  if (!issue || !isLetterContent(issue.content)) notFound();
  const letter = issue.content;
  return (
    <article className="mx-auto max-w-xl px-4 py-12 font-serif text-lg leading-relaxed">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-muted">{brand.name}</p>
      <p className="mt-6">{letter.opener}</p>
      {letter.problems.map((problem) => <p key={problem} className="mt-4">{problem}</p>)}
      <h1 className="mt-8 font-serif text-3xl">{letter.frameworkName}</h1>
      <p className="mt-3">{letter.frameworkIntro}</p>
      {letter.questions.map((item) => (
        <p key={item.label} className="mt-3"><strong>{item.label}.</strong> {item.question}</p>
      ))}
      {letter.dataMode === "SAMPLE" ? <p className="mt-4 font-sans text-sm text-muted"><SampleBadge mode="SAMPLE" /> The checks use the written scorer, not a live model.</p> : null}
      <h2 className="mt-8 font-serif text-3xl">Today: {letter.exampleTitle}</h2>
      {letter.checks.map((check) => (
        <div key={check.key} className="mt-4">
          <p><strong>{check.label} — {check.passed ? "Yes" : "No"}.</strong></p>
          <p>{check.evidence}</p>
          <p className="text-base text-muted">{check.rationale}</p>
        </div>
      ))}
      <p className="mt-8 text-xl"><strong>{letter.takeaway}</strong></p>
      <p className="mt-6">
        <Link href={letter.ctaPath} className="inline-block rounded-full bg-teal px-4 py-2 font-sans text-sm text-white">{letter.ctaLabel}</Link>
      </p>
      <p className="mt-8 whitespace-pre-line">{letter.signoff}</p>
      <p className="mt-6"><strong>PS.</strong> {letter.ps} <Link className="underline" href="/fit">Founder Fit</Link>.</p>
      <p className="mt-10 font-sans text-xs text-muted">
        <Link className="underline" href="/account">Email preferences</Link>
        {" · "}
        {brand.address}
        {" · "}
        <a className="underline" href={brand.website}>{brand.website}</a>
      </p>
    </article>
  );
}
