import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { runDailyPipeline } from "@/lib/pipeline/run";
import { publishNextApproved } from "@/lib/publish";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const queued = await runDailyPipeline(db);
  const published = await publishNextApproved();
  return NextResponse.json({ queued, published });
}
