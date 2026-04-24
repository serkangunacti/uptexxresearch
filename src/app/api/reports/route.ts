import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = await prisma.report.findMany({
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
}
