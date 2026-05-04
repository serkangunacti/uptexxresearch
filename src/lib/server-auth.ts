import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { prisma } from "./db";
import {
  AUTH_COOKIE_NAME,
  createSignedSessionCookie,
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  normalizeEmail,
  readSessionCookie,
} from "./auth";
import { hashPassword, hashToken, randomToken, verifyPassword } from "./security";
import type { SessionUser } from "./types";

const ROLE_ORDER: UserRole[] = ["VIEWER", "MANAGER", "OWNER_ADMIN"];

export async function authenticateUser(identifier: string, password: string) {
  const normalized = normalizeEmail(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        normalized.includes("@")
          ? { email: normalized }
          : { email: { startsWith: `${normalized}@`, mode: "insensitive" } },
      ],
    },
    include: { company: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const sessionToken = randomToken();
  const expiresAt = new Date(Date.now() + getSessionCookieOptions().maxAge * 1000);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      expiresAt,
    },
  });

  return {
    cookieValue: await createSignedSessionCookie(sessionToken),
    user: toSessionUser(user),
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = await readSessionCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!session) return null;

  const sessionRecord = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(session.token) },
    include: { user: { include: { company: true } } },
  });

  if (
    !sessionRecord ||
    sessionRecord.revokedAt ||
    sessionRecord.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  await prisma.userSession.update({
    where: { id: sessionRecord.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    sessionId: sessionRecord.id,
    cookieValue: await createSignedSessionCookie(session.token),
    user: toSessionUser(sessionRecord.user),
  };
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const session = await readSessionCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!session) return;

  await prisma.userSession.updateMany({
    where: { tokenHash: hashToken(session.token) },
    data: { revokedAt: new Date() },
  });
}

export async function requireUser(minRole: UserRole = "VIEWER") {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (!roleAtLeast(session.user.role, minRole)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function roleAtLeast(role: UserRole, minRole: UserRole) {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minRole);
}

export async function passwordHashFor(password: string) {
  return hashPassword(password);
}

export function getClearedCookie() {
  return {
    name: AUTH_COOKIE_NAME,
    value: "",
    options: getExpiredSessionCookieOptions(),
  };
}

function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  companyId: string;
  company: { name: string };
}): SessionUser {
  return {
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    name: user.name,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
    companyName: user.company.name,
  };
}
