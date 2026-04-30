import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";
import { enforceRateLimit, writeAuditLog } from "@/lib/governance";
import { hashPassword, hashToken } from "@/lib/security";
import { createSignedSessionCookie } from "@/lib/auth";
import { randomToken } from "@/lib/security";
import { normalizeEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const { token, name, password } = await request.json();
    if (typeof token !== "string" || typeof password !== "string" || password.length < 10) {
      return NextResponse.json({ error: "Geçersiz davet veya zayıf şifre." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    await enforceRateLimit("invite-accept", hashToken(String(token)), 10, 60);

    const invite = await prisma.inviteToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { company: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Davet geçersiz veya süresi dolmuş." }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const passwordHash = await hashPassword(password);
    const email = normalizeEmail(invite.email);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.companyId !== invite.companyId) {
      return NextResponse.json({ error: "Bu e-posta başka bir şirkette kayıtlı." }, { status: 409, headers: NO_STORE_HEADERS });
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { email },
          data: {
            role: invite.role,
            name: String(name || email.split("@")[0]),
            passwordHash,
            passwordSetAt: new Date(),
          },
        })
      : await prisma.user.create({
          data: {
            companyId: invite.companyId,
            email,
            name: String(name || email.split("@")[0]),
            role: invite.role,
            passwordHash,
            passwordSetAt: new Date(),
          },
        });

    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
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

    await writeAuditLog({
      companyId: invite.companyId,
      userId: user.id,
      action: "user.accepted_invite",
      targetType: "InviteToken",
      targetId: invite.id,
      metadata: { email: user.email },
    });

    const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    response.cookies.set(
      AUTH_COOKIE_NAME,
      await createSignedSessionCookie(sessionToken),
      getSessionCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ error: "Çok fazla deneme yapıldı." }, { status: 429, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
