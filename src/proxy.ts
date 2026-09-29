import { NextResponse, type NextRequest } from "next/server";

// Password gate for the whole app (candidate data + email sending).
// Required in production; skipped locally when APP_PASSWORD is unset.
export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("APP_PASSWORD is not configured.", { status: 503 });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(given, password)) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Kargo Hiring", charset="UTF-8"' },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
