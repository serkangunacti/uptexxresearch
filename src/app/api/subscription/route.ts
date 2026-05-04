import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-errors";
import { assertPlatformAdmin, getCompanySubscription } from "@/lib/catalog";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const subscription = await getCompanySubscription(session.user.companyId);
    return NextResponse.json({ subscription });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    assertPlatformAdmin(session.user);

    const body = await request.json();
    const packageKey = String(body.packageKey || "");
    const pkg = await prisma.planPackage.findUnique({
      where: { key: packageKey as never },
      select: { id: true },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Paket bulunamadi." }, { status: 404 });
    }

    const existing = await prisma.companySubscription.findUnique({
      where: { companyId: session.user.companyId },
      select: { id: true },
    });

    const subscription = existing
      ? await prisma.companySubscription.update({
          where: { companyId: session.user.companyId },
          data: {
            packageId: pkg.id,
            status: "ACTIVE",
            endsAt: null,
          },
          include: { package: true },
        })
      : await prisma.companySubscription.create({
          data: {
            companyId: session.user.companyId,
            packageId: pkg.id,
            status: "ACTIVE",
          },
          include: { package: true },
        });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    return jsonError(error);
  }
}
