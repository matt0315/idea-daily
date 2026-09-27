import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { isLetterContent } from "@/lib/letter";

export const metadata: Metadata = { title: "Letter preview" };

export default async function AdminLetterPage({ searchParams }: { searchParams: Promise<{ slug?: string; theme?: string; sent?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/letter");
  if (!user.isAdmin) redirect("/");
  const sp = await searchParams;
  const issues = await db.newsletterIssue.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const current = issues.find((issue) => issue.slug === sp.slug) || issues[0];
  const theme = sp.theme === "dark" ? "dark" : "light";
  const letter = current && isLetterContent(current.content) ? current.content : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm"><Link className="underline" href="/admin">Back to the queue</Link></p>
      <h1 className="mt-3 font-serif text-5xl">Daily letter</h1>
      <p className="mt-2 text-sm text-muted">Preview of the {brand.name} letter. Without a Resend key, “Send test to me” stays on this page and does not send.</p>
      {sp.sent === "stub" ? <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-950">Resend is not configured. This is a preview only. Nothing was sent.</p> : null}
      {sp.sent === "ok" ? <p className="mt-3 text-sm text-teal">Test sent to {user.email}.</p> : null}
      {sp.sent === "missing" ? <p className="mt-3 text-sm text-copper">That issue could not be rendered.</p> : null}
      {issues.length === 0 || !current || !letter ? <p className="mt-6">No issue yet. Publish an idea and the letter is written with it.</p> : (
        <>
          <form className="mt-4 flex flex-wrap items-center gap-2" method="get">
            <select name="slug" defaultValue={current.slug} className="max-w-full rounded-full border border-line bg-card px-3 py-2 text-sm">
              {issues.map((issue) => <option key={issue.slug} value={issue.slug}>{letter && issue.id === current.id ? issue.subject : issue.subject}</option>)}
            </select>
            <input type="hidden" name="theme" value={theme} />
            <button className="rounded-full border border-line px-3 py-2 text-sm" type="submit">Open</button>
            <Link className="rounded-full border border-line px-3 py-2 text-sm" href={`/admin/letter?slug=${current.slug}&theme=light`}>Light</Link>
            <Link className="rounded-full border border-line px-3 py-2 text-sm" href={`/admin/letter?slug=${current.slug}&theme=dark`}>Dark</Link>
          </form>
          <iframe title="Letter preview" className="mt-4 h-[920px] w-full rounded-2xl border border-line bg-paper" src={`/admin/letter/preview?slug=${current.slug}&theme=${theme}`} />
          <form action="/api/admin/letter/test" method="post" className="mt-4">
            <input type="hidden" name="slug" value={current.slug} />
            <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Send test to me</button>
          </form>
        </>
      )}
    </div>
  );
}
