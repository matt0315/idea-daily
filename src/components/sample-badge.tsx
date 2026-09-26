export function SampleBadge({ mode, className = "" }: { mode?: "SAMPLE" | "LIVE" | string; className?: string }) {
  if (mode && mode !== "SAMPLE") return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}>
      Sample data
    </span>
  );
}
