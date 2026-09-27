import Link from "next/link";
import { BUILD_TOOLS } from "@/lib/build-guides";
import { db } from "@/lib/db";

export default async function BuiltWithIndex() {
  const counts = await db.galleryItem.groupBy({ by: ["tool"], where: { status: "approved" }, _count: { _all: true } });
  const byTool = new Map(counts.map((row) => [row.tool, row._count._all]));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl">Built with</h1>
      <p className="mt-3 text-muted">Apps people submit after building from an idea. Sample entries are labelled. New submissions wait for a reviewer.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {BUILD_TOOLS.map((tool) => (
          <Link key={tool.id} href={`/built-with/${tool.id}`} className="rounded-2xl border border-line bg-card p-4 hover:border-teal">
            <h2 className="font-serif text-2xl">{tool.name}</h2>
            <p className="text-sm text-muted">{tool.blurb}</p>
            <p className="mt-2 text-sm">{byTool.get(tool.id) ?? 0} approved</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
