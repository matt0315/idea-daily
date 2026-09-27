import { brand } from "@/lib/brand";
import type { FocusChecklist } from "@/lib/focus";
import { SampleBadge } from "./sample-badge";

export function FocusPanel({ checklist, id }: { checklist: FocusChecklist; id?: string }) {
  const failed = checklist.checks.filter((check) => !check.passed);
  return (
    <section className="mt-8 rounded-3xl border border-line bg-card p-5" id={id}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-3xl">{brand.focusName}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${checklist.verdict === "pass" ? "bg-teal-soft text-teal-dark" : "bg-copper-soft text-copper"}`}>
          {checklist.verdict === "pass" ? "Pass" : "Needs work"}
        </span>
        <SampleBadge mode={checklist.dataMode} />
      </div>
      <p className="mt-2 text-sm text-muted">{checklist.passedCount} of 4 checks have evidence. Pass means all four. This is a writing test, not a market measurement.</p>
      {failed.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {failed.map((check) => (
            <li key={check.key} className="rounded-full bg-copper-soft px-3 py-1 text-xs font-semibold text-copper">Missing: {check.label}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm">All four checks have a sentence. This is a candidate for the next 90 days.</p>
      )}
      <ol className="mt-4 space-y-4">
        {checklist.checks.map((check) => (
          <li key={check.key}>
            <p className="font-semibold">{check.label} · {check.passed ? "Yes" : "No"}</p>
            <p className="text-sm">{check.evidence}</p>
            <p className="text-sm text-muted">{check.rationale}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
