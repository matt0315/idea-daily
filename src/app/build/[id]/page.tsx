import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvisorPanel } from "@/components/advisor-panel";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";
import { SKILLS } from "@/lib/skills";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const project = await db.project.findUnique({ where: { id }, include: { idea: true } });
  if (!project || project.userId !== user?.id) notFound();
  const plan = asPlan(user.plan);
  const allowed = canAccess(plan, "buildHub");
  const outputs = (project.outputs || {}) as Record<string, { markdown?: string; createdAt?: string }>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-teal">Project</p>
      <h1 className="font-serif text-5xl">{project.title}</h1>
      {project.idea ? <p className="mt-2 text-sm"><Link className="underline" href={`/ideas/${project.idea.slug}`}>{project.idea.title}</Link></p> : null}
      {alphabetNiche(project.context) ? <p className="mt-2 text-sm text-muted">Saved from Alphabet Demand · {alphabetNiche(project.context)}</p> : null}
      {!allowed ? <p className="mt-4 text-copper">Running skills requires Pro.</p> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {SKILLS.map((skill) => (
          <form key={skill.id} action={`/api/projects/${project.id}/skills`} method="post">
            <input type="hidden" name="skill" value={skill.id} />
            <button disabled={!allowed} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm" type="submit">{skill.name}</button>
          </form>
        ))}
        <a className="rounded-full bg-ink px-3 py-1.5 text-sm text-paper" href={`/api/projects/${project.id}/export`}>Export Markdown</a>
      </div>
      <div className="mt-8 space-y-6">
        {Object.entries(outputs).map(([skill, output]) => (
          <section key={skill}>
            <h2 className="font-serif text-2xl capitalize">{skill}</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-card p-4 text-sm leading-6">{output.markdown}</pre>
          </section>
        ))}
      </div>
      <div className="mt-8">
        <AdvisorPanel projectId={project.id} ideaId={project.ideaId ?? undefined} enabled={canAccess(plan, "advisor")} signedIn />
      </div>
    </div>
  );
}

function alphabetNiche(context: unknown): string | null {
  if (!context || typeof context !== "object") return null;
  const niche = (context as { alphabetIdea?: { niche?: string } }).alphabetIdea?.niche;
  return niche || null;
}
