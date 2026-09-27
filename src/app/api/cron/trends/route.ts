import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cronAuthorized } from "@/lib/http";
import { refreshTrends } from "@/lib/pipeline/trends-job";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await refreshTrends(db);
  return NextResponse.json(result);
}
