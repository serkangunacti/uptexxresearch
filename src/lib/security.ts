import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derivedKey = (await scrypt(password, salt, expected.length)) as Buffer;
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}

export function maskApiKey(secret: string) {
  const tail = secret.slice(-4);
  return `${"*".repeat(Math.max(secret.length - 4, 8))}${tail}`;
}

export function encryptSecret(secret: string) {
  const key = resolveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: { encryptedKey: string; iv: string; authTag: string }) {
  const key = resolveEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedKey, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function resolveEncryptionKey() {
  const input = (process.env.APP_ENCRYPTION_KEY || "").trim();
  if (input.length < 16) {
    throw new Error("APP_ENCRYPTION_KEY is missing or too short.");
  }
  return createHash("sha256").update(input).digest();
}
