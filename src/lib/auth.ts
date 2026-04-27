export const AUTH_COOKIE_NAME = "uptexx_auth";
export const SESSION_TTL_SECONDS = 60 * 60;

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
  v: 1;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function normalizeUsername(input: unknown) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .split("@")[0];
}

export function authIsConfigured() {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() &&
      process.env.ADMIN_PASSWORD &&
      getSessionSecret()
  );
}

export function credentialsAreValid(username: unknown, password: unknown) {
  const configuredUsername = normalizeUsername(process.env.ADMIN_USERNAME);
  const configuredPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!authIsConfigured()) return false;

  return (
    normalizeUsername(username) === configuredUsername &&
    constantTimeEqual(String(password ?? ""), configuredPassword)
  );
}

export async function createSessionCookie(username: string, now = new Date()) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET or AUTH_SECRET is not configured.");
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: SessionPayload = {
    sub: normalizeUsername(username),
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
    v: 1,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function readSessionCookie(value: string | undefined | null, now = new Date()) {
  const secret = getSessionSecret();
  if (!value || !secret) return null;

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const validSignature = await verify(encodedPayload, signature, secret);
    if (!validSignature) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload))) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    if (
      payload.v !== 1 ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      typeof payload.exp !== "number" ||
      payload.exp <= nowSeconds
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

function getSessionSecret() {
  const secret = (process.env.SESSION_SECRET ?? process.env.AUTH_SECRET ?? "").trim();
  return secret.length >= 32 ? secret : "";
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let i = 0; i < length; i += 1) {
    mismatch |= (leftBytes[i] ?? 0) ^ (rightBytes[i] ?? 0);
  }

  return mismatch === 0;
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string, secret: string) {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verify(value: string, signature: string, secret: string) {
  const key = await getHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, base64UrlDecode(signature), encoder.encode(value));
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
