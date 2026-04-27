import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "uptexx_auth";
const SESSION_TTL_SECONDS = 60 * 60;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "uptexx-auth-fallback-secret";
const encoder = new TextEncoder();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const normalizedInput = (username || "").trim().toLowerCase();
    const userWithoutDomain = normalizedInput.split("@")[0];
    const isCorrectUser = userWithoutDomain === "serkangunacti";
    const isCorrectPass = password === "Trabzon61!";

    if (isCorrectUser && isCorrectPass) {
      const response = NextResponse.json({ success: true });
      response.cookies.set(AUTH_COOKIE_NAME, await createAuthToken(), {
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return response;
    }

    return NextResponse.json({ success: false, error: "Hatalı bilgiler" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
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
