import { NextResponse } from "next/server";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user || !canAccess(asPlan(user.plan), "buildHub")) {
    return NextResponse.json({ error: "The build hub is on Pro." }, { status: 403 });
  }
  const project = await db.project.findFirst({ where: { id, userId: user.id } });
  if (!project) return NextResponse.json({ error: "missing" }, { status: 404 });
  const outputs = (project.outputs || {}) as Record<string, { markdown?: string }>;
  const body = [`# ${project.title}`, "", ...Object.entries(outputs).flatMap(([name, output]) => [`## ${name}`, "", output.markdown || "", ""])].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md"`,
    },
  });
}
