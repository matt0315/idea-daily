"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "ask" | "roast" | "next";

export function AdvisorPanel({
  ideaId,
  projectId,
  reportId,
  enabled,
  signedIn,
}: {
  ideaId?: string;
  projectId?: string;
  reportId?: string;
  enabled: boolean;
  signedIn: boolean;
}) {
  const [mode, setMode] = useState<Mode>("ask");
  const [question, setQuestion] = useState("What should I charge?");
  const [messages, setMessages] = useState<{ role: string; content: string; dataMode?: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId, projectId, reportId, mode, question }),
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(body.error || "Could not ask.");
      return;
    }
    setMessages((current) => [
      ...current,
      { role: "user", content: mode === "ask" ? question : mode },
      { role: "assistant", content: body.content, dataMode: body.dataMode },
    ]);
  }

  return (
    <section id="advisor" className="rounded-3xl border border-line bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Idea Advisor</p>
          <h2 className="font-serif text-3xl">Ask, roast, or take the next step</h2>
        </div>
        <div className="flex gap-2">
          {(["ask", "roast", "next"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${mode === item ? "bg-teal text-white" : "border border-line"}`}
            >
              {item === "next" ? "Next step" : item}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        Answers stay inside the stored brief and its footnotes. Roast ends in Build, Pivot, or Skip.
      </p>
      {!signedIn ? (
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-teal">Sign in to use the advisor</Link>
      ) : !enabled ? (
        <Link href="/pricing" className="mt-4 inline-block text-sm font-semibold text-copper">Advisor starts on Builder (20 chats / month). Pro includes 150.</Link>
      ) : (
        <div className="mt-4 space-y-3">
          {mode === "ask" ? (
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="w-full rounded-xl border border-line bg-paper p-3 text-sm" rows={3} />
          ) : (
            <p className="text-sm text-muted">{mode === "roast" ? "Roast uses the stored scores. It does not run new research." : "One action for today, taken from the execution plan."}</p>
          )}
          <button type="button" disabled={pending} onClick={send} className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50">
            {pending ? "Thinking" : mode === "ask" ? "Ask" : mode === "roast" ? "Roast this" : "Give me the next step"}
          </button>
          {error ? <p className="text-sm text-copper">{error}</p> : null}
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`rounded-2xl p-3 text-sm whitespace-pre-wrap ${message.role === "assistant" ? "bg-teal-soft" : "bg-paper"}`}>
                {message.dataMode === "SAMPLE" ? <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-amber-800">Sample data in the source brief</span> : null}
                {message.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
