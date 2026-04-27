import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "uptexx_auth";
const SESSION_TTL_SECONDS = 60 * 60;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "uptexx-auth-fallback-secret";
const encoder = new TextEncoder();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes("logo") ||
    pathname.includes("favicon") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!(await verifyAuthToken(token))) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(AUTH_COOKIE_NAME, await createAuthToken(), {
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return response;
}

async function createAuthToken() {
  const expiresAt = String(Date.now() + SESSION_TTL_SECONDS * 1000);
  const signature = await signValue(expiresAt);
  return `${expiresAt}.${signature}`;
}

async function verifyAuthToken(token?: string) {
  if (!token) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");

  if (!expiresAt || !signature) {
    return false;
  }

  const expectedSignature = await signValue(expiresAt);
  const expiryTime = Number(expiresAt);

  return signature === expectedSignature && Number.isFinite(expiryTime) && expiryTime > Date.now();
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
