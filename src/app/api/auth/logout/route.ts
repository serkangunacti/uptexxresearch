import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getExpiredSessionCookieOptions } from "@/lib/auth";
import { destroyCurrentSession } from "@/lib/server-auth";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
export async function POST() {
  await destroyCurrentSession();
  const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(AUTH_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  return response;
}
