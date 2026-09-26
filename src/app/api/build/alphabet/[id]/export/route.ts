import { NextResponse } from "next/server";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { alphabetDemand } from "@/lib/autocomplete/copy";
import { asGroups, readDrafts } from "@/lib/autocomplete/mine";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user || !canAccess(asPlan(user.plan), "alphabet")) {
    return NextResponse.json({ error: "Alphabet Demand starts on Builder." }, { status: 403 });
  }
  const mine = await db.autocompleteMine.findFirst({ where: { id, userId: user.id } });
  if (!mine) return NextResponse.json({ error: "Missing mine." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "md";
  const ideas = readDrafts(mine.ideas);
  const groups = asGroups(mine.groups);
  if (format === "csv") {
    const header = ["title", "summary", "productType", "ideaType", "cluster", "searches", "opportunity", "pain", "buildability", "timing"];
    const lines = ideas.map((idea) =>
      [csv(idea.title), csv(idea.summary), idea.productType, idea.ideaType, csv(idea.clusterLabel), csv(idea.searches.join(" | ")), idea.scores.opportunity, idea.scores.pain, idea.scores.buildability, idea.scores.timing].join(","),
    );
    return new NextResponse([header.join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug(mine.niche)}-alphabet.csv"`,
      },
    });
  }
  const sections = [
    ["Questions", groups.questions],
    ["Problems", groups.problems],
    ["Desires", groups.desires],
  ] as const;
  const markdown = [
    `# ${alphabetDemand.name} — ${mine.niche}`,
    "",
    `${mine.country} · ${mine.language} · ${mine.source} · ${mine.dataMode === "SAMPLE" ? "Sample data" : "Live suggestions"}`,
    "",
    ...sections.flatMap(([title, clusters]) => [
      `## ${title}`,
      ...clusters.map((cluster) => `### ${cluster.label} (${cluster.count})\n${cluster.suggestions.map((suggestion) => `- ${suggestion.text}`).join("\n")}`),
      "",
    ]),
    "## Ideas",
    ...ideas.flatMap((idea) => [
      `### ${idea.title}`,
      idea.summary,
      "",
      `Type: ${idea.productLabel}`,
      `Searches: ${idea.searches.join("; ")}`,
      `Scores: opportunity ${idea.scores.opportunity}, pain ${idea.scores.pain}, buildability ${idea.scores.buildability}, timing ${idea.scores.timing}`,
      "",
    ]),
  ].join("\n");
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(mine.niche)}-alphabet.md"`,
    },
  });
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mine";
}
