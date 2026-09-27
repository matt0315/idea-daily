import type { IdeaSource } from "@/lib/idea-view";

export function RichText({ text, sources }: { text: string; sources: IdeaSource[] }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="prose-report text-[17px] leading-7 text-ink">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {paragraph.split(/(\{\{s\d+\}\})/g).map((part, partIndex) => {
            const match = part.match(/^\{\{s(\d+)\}\}$/);
            if (!match) return <span key={partIndex}>{part}</span>;
            const id = Number(match[1]);
            const source = sources.find((item) => item.id === id);
            return (
              <a key={partIndex} href={`#source-${id}`} className="ml-0.5 text-teal align-super text-xs font-semibold" title={source?.title}>
                {id}
              </a>
            );
          })}
        </p>
      ))}
    </div>
  );
}

export function SourceList({ sources }: { sources: IdeaSource[] }) {
  if (sources.length === 0) return null;
  return (
    <ol className="mt-8 space-y-3 border-t border-line pt-6 text-sm text-muted">
      {sources.map((source) => (
        <li key={source.id} id={`source-${source.id}`} className="grid grid-cols-[auto_1fr] gap-3">
          <span className="font-semibold text-teal">{source.id}</span>
          <span>
            <a href={source.url} className="text-ink underline decoration-line underline-offset-2">
              {source.title}
            </a>
            <span className="text-muted"> — {source.publisher}, accessed {source.accessed}. {source.note}</span>
            {source.sample ? <span className="ml-2 rounded bg-copper-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-copper">Sample</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
