import "server-only";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/** Calls Gemini with a JSON response schema and returns the parsed JSON. Retries once on bad output. */
export async function geminiJSON(prompt: string, schema: object, attempts = 2): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
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
        const msg = await res.text();
        // Don't retry auth / bad request errors
        if (res.status < 500 && res.status !== 429) throw new Error(`Gemini ${res.status}: ${msg.slice(0, 300)}`);
        throw Object.assign(new Error(`Gemini ${res.status}: ${msg.slice(0, 300)}`), { retry: true });
      }
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("");
      if (!text) throw Object.assign(new Error("Gemini returned an empty response"), { retry: true });
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      const retriable = e instanceof SyntaxError || (e as { retry?: boolean }).retry;
      if (!retriable) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
