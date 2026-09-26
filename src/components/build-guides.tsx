"use client";

import { useState } from "react";
import Link from "next/link";
import type { BuildGuide } from "@/lib/build-guides";

export function BuildGuideTabs({
  slug,
  guides,
}: {
  slug: string;
  guides: (BuildGuide & { allowed: boolean })[];
}) {
  const firstOpen = guides.find((guide) => guide.allowed)?.tool ?? guides[0].tool;
  const [tool, setTool] = useState(firstOpen);
  const active = guides.find((guide) => guide.tool === tool) ?? guides[0];
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {guides.map((guide) => (
          <button
            key={guide.tool}
            type="button"
            onClick={() => setTool(guide.tool)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
              guide.tool === tool ? "border-teal bg-teal text-white" : "border-line bg-card text-ink"
            }`}
          >
            {guide.name}
            {guide.allowed ? "" : " · locked"}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-card">
        <p className="text-sm text-muted">{active.blurb}</p>
        {active.allowed ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a className="rounded-full bg-ink px-3 py-1.5 text-paper" href={`/api/ideas/${slug}/guides?tool=${active.tool}`}>
                Download Markdown
              </a>
              {active.tool === "claude-code" ? (
                <a className="rounded-full border border-line px-3 py-1.5" href={`/api/ideas/${slug}/guides?tool=${active.tool}&format=zip`}>
                  Download starter zip
                </a>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1.5"
                onClick={async () => {
                  await navigator.clipboard.writeText(active.prompt);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy prompt"}
              </button>
              <Link href={`/built-with/${active.tool}`} className="rounded-full border border-line px-3 py-1.5">
                Gallery
              </Link>
            </div>
            <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-xs leading-5 text-paper">{active.prompt}</pre>
          </>
        ) : (
          <div className="mt-4 rounded-xl bg-copper-soft p-4 text-sm">
            <p>The free plan includes the Cursor guide. Builder unlocks every tool.</p>
            <Link href="/pricing" className="mt-2 inline-block font-semibold text-copper">
              See Builder
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
