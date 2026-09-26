import type { Metadata } from "next";
import Link from "next/link";
import { BuildNav } from "@/components/build-nav";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";

export const metadata: Metadata = { title: "Build hub" };

export default async function BuildPage() {
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const allowed = canAccess(plan, "buildHub");
  const projects = user ? await db.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { idea: true } }) : [];
  const ideas = await db.idea.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { id: true, title: true } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl">Build hub</h1>
      <BuildNav current="projects" />
      <p className="mt-3 text-muted">A project holds the idea, your profile, and chained skills: offer, voice, landing page, email sequence, and a 7-day ship plan. Run-all writes them in order. Export is Markdown you can drop into the build tools. Alphabet Demand, on the other tab, is available from Builder.</p>
      {!user ? <p className="mt-4"><Link className="font-semibold text-teal" href="/login?next=/build">Sign in</Link></p> : null}
      {user && !allowed ? <p className="mt-4 text-copper">Skills are on Pro. You can still read build guides on each idea.</p> : null}
      {user && allowed ? (
        <form action="/api/projects" method="post" className="mt-6 flex flex-wrap gap-2">
          <select name="ideaId" className="rounded-full border border-line bg-card px-3 py-2">
            <option value="">No linked idea</option>
            {ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}
          </select>
          <input name="title" placeholder="Project title" className="rounded-full border border-line bg-card px-3 py-2" />
          <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">New project</button>
        </form>
      ) : null}
      <ul className="mt-6 space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/build/${project.id}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
              <span className="font-serif text-2xl">{project.title}</span>
              <span className="mt-1 block text-sm text-muted">{project.idea?.title || "No idea linked"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
