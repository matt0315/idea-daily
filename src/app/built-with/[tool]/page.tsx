import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBadge } from "@/components/sample-badge";
import { BUILD_TOOLS } from "@/lib/build-guides";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function ToolGallery({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const known = BUILD_TOOLS.find((item) => item.id === tool);
  if (!known) notFound();
  const items = await db.galleryItem.findMany({ where: { tool, status: "approved" }, include: { idea: true }, orderBy: { createdAt: "desc" } });
  const ideas = await db.idea.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } });
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-teal">Built with</p>
      <h1 className="font-serif text-5xl">{known.name}</h1>
      <p className="mt-2 text-muted">{known.blurb}</p>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl">{item.title}</h2>
              <SampleBadge mode={item.dataMode} />
            </div>
            <p className="text-sm">{item.blurb}</p>
            <p className="mt-1 text-sm text-muted">{item.makerName}</p>
            <div className="mt-2 flex gap-3 text-sm">
              <a className="underline" href={item.url}>Open</a>
              {item.idea ? <Link className="underline" href={`/ideas/${item.idea.slug}`}>Idea: {item.idea.title}</Link> : null}
            </div>
          </article>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted">No approved builds for this tool yet.</p> : null}
      </div>
      <form action="/api/gallery" method="post" className="mt-8 space-y-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-2xl">Submit a build</h2>
        {!user ? <p className="text-sm">Sign in to submit. It stays pending until a reviewer approves it.</p> : null}
        <input type="hidden" name="tool" value={tool} />
        <input name="title" required placeholder="App name" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <input name="url" required type="url" placeholder="https://" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <input name="makerName" required placeholder="Your name" className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <select name="ideaSlug" className="w-full rounded-xl border border-line bg-paper px-3 py-2">
          <option value="">Link an idea (optional)</option>
          {ideas.map((idea) => <option key={idea.slug} value={idea.slug}>{idea.title}</option>)}
        </select>
        <textarea name="blurb" required placeholder="What you built" rows={3} className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Submit for review</button>
      </form>
    </div>
  );
}
