import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getSessionCookieOptions, normalizeEmail } from "@/lib/auth";
import { authenticateUser } from "@/lib/server-auth";
import { enforceRateLimit } from "@/lib/governance";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();
    const normalizedEmail = normalizeEmail(email ?? username);
    const rateKey = `${normalizedEmail}:${request.headers.get("x-forwarded-for") ?? "local"}`;

    await enforceRateLimit("login", rateKey, 10, 15);

    const session = await authenticateUser(normalizedEmail, String(password ?? ""));

    if (!session) {
      return NextResponse.json({ success: false, error: "Hatalı bilgiler" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const response = NextResponse.json({ success: true, user: session.user }, { headers: NO_STORE_HEADERS });
    response.cookies.set(AUTH_COOKIE_NAME, session.cookieValue, getSessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ success: false, error: "Çok fazla deneme yapıldı." }, { status: 429, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
