import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { enforceRateLimit, writeAuditLog } from "@/lib/governance";
import { randomToken, hashToken } from "@/lib/security";
import { normalizeEmail } from "@/lib/auth";
import { requireUser } from "@/lib/server-auth";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const users = await prisma.user.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ users }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const { email, role, name } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = normalizeRole(role);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { companyId: true },
    });
    if (existingUser && existingUser.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Bu e-posta başka bir şirkete ait kullanıcı hesabında kayıtlı." },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    await enforceRateLimit("invite-user", `${session.user.companyId}:${normalizedEmail}`, 10, 60);

    const token = randomToken(24);
    const invite = await prisma.inviteToken.create({
      data: {
        companyId: session.user.companyId,
        email: normalizedEmail,
        role: normalizedRole,
        invitedByUserId: session.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await writeAuditLog({
      companyId: session.user.companyId,
      userId: session.user.id,
      action: "user.invited",
      targetType: "InviteToken",
      targetId: invite.id,
      metadata: { email: normalizedEmail, role: normalizedRole, name: name ?? "" },
    });

    const inviteUrl = `${env.APP_PUBLIC_URL}/invite/${token}`;
    return NextResponse.json({ success: true, inviteUrl }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

function normalizeRole(role: unknown): UserRole {
  if (role === "MANAGER" || role === "VIEWER") return role;
  return "VIEWER";
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }
  if (error instanceof Error && error.message === "RATE_LIMITED") {
    return NextResponse.json({ error: "Çok fazla istek yapıldı." }, { status: 429, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: NO_STORE_HEADERS });
}
