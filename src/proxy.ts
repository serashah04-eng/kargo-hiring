import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/session";

// Optional password gate for the whole app. Open to everyone when APP_PASSWORD is unset.
export async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const { pathname } = req.nextUrl;
  if (!password) {
    return pathname === "/login" ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, await sessionToken(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) return Response.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
