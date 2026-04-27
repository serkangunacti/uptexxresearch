import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getExpiredSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  return response;
}
