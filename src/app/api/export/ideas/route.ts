import { NextResponse } from "next/server";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/gating";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccess(asPlan(user.plan), "exports")) {
    return NextResponse.json({ error: "Exports are on Builder." }, { status: 403 });
  }
  const ideas = await db.idea.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  const header = ["slug", "title", "category", "market", "opportunity", "pain", "buildability", "timing", "growth", "dataMode"];
  const lines = ideas.map((idea) =>
    [idea.slug, csv(idea.title), csv(idea.category), idea.market, idea.opportunity, idea.pain, idea.buildability, idea.timing, idea.growth, idea.dataMode].join(","),
  );
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ideas.csv",
    },
  });
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
