import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const reports = await prisma.report.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        agent: true,
        findings: {
          orderBy: { createdAt: "asc" },
          take: 5
        }
      }
    });

    return NextResponse.json({ reports });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ reports: [] }, { status: 401 });
    }
    return NextResponse.json({ reports: [] }, { status: 500 });
  }
}
