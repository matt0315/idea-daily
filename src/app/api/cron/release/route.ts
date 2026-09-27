import { NextResponse } from "next/server";
import { releaseCommunityWork } from "@/lib/community/release";
import { db } from "@/lib/db";
import { cronAuthorized } from "@/lib/http";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await releaseCommunityWork(db);
  return NextResponse.json(result);
}
