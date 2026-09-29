import { cookies } from "next/headers";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/session";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return Response.json({ ok: true }); // gate disabled locally

  const body = await req.json().catch(() => ({}));
  const given = String(body?.password ?? "").trim();
  if (!safeEqual(given, password.trim())) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: "Wrong password. Check capitals and try again." }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return Response.json({ ok: true });
}

/** Sign out */
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
