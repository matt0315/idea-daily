import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const staticPaths = ["", "/today", "/ideas", "/trends", "/insights", "/pricing", "/methodology", "/built-with", "/fit", "/letter", "/privacy"].map((path) => ({
    url: `${base}${path || "/"}`,
  }));
  try {
    const ideas = await db.idea.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
    return [
      ...staticPaths,
      ...ideas.map((idea) => ({ url: `${base}/ideas/${idea.slug}`, lastModified: idea.updatedAt })),
    ];
  } catch {
    return staticPaths;
  }
}
