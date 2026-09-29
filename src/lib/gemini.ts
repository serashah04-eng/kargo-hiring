import "server-only";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// Used when the primary model is overloaded (503/429) or times out
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";
const TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls Gemini with a JSON response schema and returns the parsed JSON. Retries transient failures. */
export async function geminiJSON(prompt: string, schema: object): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");

  const plan = [GEMINI_MODEL, GEMINI_MODEL, FALLBACK_MODEL, FALLBACK_MODEL].filter(Boolean);
  let lastErr: unknown;
  for (let i = 0; i < plan.length; i++) {
    if (i > 0) await sleep(1500 * i);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${plan[i]}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
        },
      );
      if (!res.ok) {
        const msg = (await res.text()).slice(0, 300);
        // Auth / bad request errors won't fix themselves
        if (res.status < 500 && res.status !== 429) throw new Error(`Gemini ${res.status}: ${msg}`);
        throw Object.assign(new Error(`Gemini is busy (${res.status}). Please retry in a minute.`), { retry: true });
      }
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("");
      if (!text) throw Object.assign(new Error("Gemini returned an empty response"), { retry: true });
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      const name = (e as Error).name;
      const retriable =
        e instanceof SyntaxError || (e as { retry?: boolean }).retry || name === "TimeoutError" || name === "TypeError";
      if (!retriable) break;
    }
  }
  const err = lastErr as Error;
  if (err?.name === "TimeoutError") throw new Error("Gemini timed out. Please retry.");
  throw err instanceof Error ? err : new Error(String(lastErr));
}
