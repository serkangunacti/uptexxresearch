import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSignedSessionCookie,
  getSessionCookieOptions,
  readSessionCookie,
} from "@/lib/auth";

const PUBLIC_FILE_PATTERN = /\.(.*)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/uptexx-logo.png" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api/cron") {
    return cronIsAuthorized(request)
      ? NextResponse.next()
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/invite/") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/invite/accept" ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const session = await readSessionCookie(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.cookies.set(
    AUTH_COOKIE_NAME,
    await createSignedSessionCookie(session.token),
    getSessionCookieOptions()
  );

  return response;
}

function cronIsAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
