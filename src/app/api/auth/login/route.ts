import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authIsConfigured,
  createSessionCookie,
  credentialsAreValid,
  getSessionCookieOptions,
  normalizeUsername,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!authIsConfigured()) {
      return NextResponse.json(
        { success: false, error: "Kimlik dogrulama ayarlari eksik." },
        { status: 500 }
      );
    }

    if (credentialsAreValid(username, password)) {
      const response = NextResponse.json({ success: true });
      const cookieValue = await createSessionCookie(normalizeUsername(username));
      response.cookies.set(AUTH_COOKIE_NAME, cookieValue, getSessionCookieOptions());

      return response;
    }

    return NextResponse.json({ success: false, error: "Hatalı bilgiler" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
