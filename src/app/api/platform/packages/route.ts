import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-errors";
import { assertPlatformAdmin } from "@/lib/catalog";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);

    const packages = await prisma.planPackage.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);
    const body = await request.json();

    const pkg = await prisma.planPackage.create({
      data: {
        key: String(body.key || "") as never,
        name: String(body.name || ""),
        monthlyPrice: Number(body.monthlyPrice ?? 0),
        currency: String(body.currency || "USD"),
        activeAgentLimit: Number(body.activeAgentLimit ?? 1),
        allowsCustomAgentBuilder: body.allowsCustomAgentBuilder === true,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, package: pkg });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);
    const body = await request.json();
    const id = String(body.id || "");

    const pkg = await prisma.planPackage.update({
      where: { id },
      data: {
        name: String(body.name || ""),
        monthlyPrice: Number(body.monthlyPrice ?? 0),
        currency: String(body.currency || "USD"),
        activeAgentLimit: Number(body.activeAgentLimit ?? 1),
        allowsCustomAgentBuilder: body.allowsCustomAgentBuilder === true,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, package: pkg });
  } catch (error) {
    return jsonError(error);
  }
}
