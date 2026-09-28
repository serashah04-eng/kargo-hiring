export function errorResponse(e: unknown, extra?: Record<string, unknown>, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[api]", message);
  return Response.json({ error: message, ...extra }, { status });
}

export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
