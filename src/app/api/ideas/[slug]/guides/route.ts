import JSZip from "jszip";
import { NextResponse } from "next/server";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { briefFromUnknown, guidesForBrief, type BuildToolId } from "@/lib/build-guides";
import { db } from "@/lib/db";
import { guideAllowed } from "@/lib/gating";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const idea = await db.idea.findUnique({ where: { slug } });
  if (!idea || idea.status !== "PUBLISHED") return NextResponse.json({ error: "missing" }, { status: 404 });
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const url = new URL(request.url);
  const tool = url.searchParams.get("tool") || "cursor";
  if (!guideAllowed(plan, tool)) return NextResponse.json({ error: "This guide is on Builder." }, { status: 403 });
  const guide = guidesForBrief(briefFromUnknown(idea.buildBrief, idea.title)).find((item) => item.tool === (tool as BuildToolId));
  if (!guide) return NextResponse.json({ error: "unknown tool" }, { status: 404 });

  if (url.searchParams.get("format") === "zip") {
    const zip = new JSZip();
    for (const file of guide.files) zip.file(file.path, file.content);
    const bytes = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-${tool}.zip"`,
      },
    });
  }

  const markdown = guide.files.map((file) => `# ${file.path}\n\n${file.content}`).join("\n\n---\n\n");
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${tool}.md"`,
    },
  });
}
