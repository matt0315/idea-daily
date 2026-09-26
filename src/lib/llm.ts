export type LlmResult = { ok: true; text: string; provider: string } | { ok: false; reason: string };

export function llmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

function provider(): "openai" | "anthropic" | "gemini" | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** Structured-ish JSON prompt. Callers must validate the text. Returns a failure when no key is set. */
export async function completeText(system: string, user: string): Promise<LlmResult> {
  const which = provider();
  if (!which) return { ok: false, reason: "no_provider" };
  try {
    if (which === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!response.ok) return { ok: false, reason: `openai_${response.status}` };
      const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content;
      if (!text) return { ok: false, reason: "openai_empty" };
      return { ok: true, text, provider: "openai" };
    }
    if (which === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
          max_tokens: 1800,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!response.ok) return { ok: false, reason: `anthropic_${response.status}` };
      const body = (await response.json()) as { content?: { text?: string }[] };
      const text = body.content?.map((block) => block.text || "").join("\n");
      if (!text) return { ok: false, reason: "anthropic_empty" };
      return { ok: true, text, provider: "anthropic" };
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        }),
      },
    );
    if (!response.ok) return { ok: false, reason: `gemini_${response.status}` };
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
    if (!text) return { ok: false, reason: "gemini_empty" };
    return { ok: true, text, provider: "gemini" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
