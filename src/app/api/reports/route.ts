import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveReports, getArchivedReports } from "@/lib/report-retention";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const days = parseInt(searchParams.get('days') || '7');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    let reports;

    if (includeArchived && agentId) {
      // Get both active and archived reports for specific agent
      const [active, archived] = await Promise.all([
        getActiveReports(agentId, limit),
        getArchivedReports(agentId, limit)
      ]);
      reports = [...active, ...archived];
    } else if (agentId) {
      // Get active reports for specific agent
      reports = await getActiveReports(agentId, limit);
    } else {
      // Get all active reports with retention applied
      const retentionDays = days;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      reports = await prisma.report.findMany({
        where: {
          isArchived: false,
          createdAt: { gte: cutoffDate }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          agent: true,
          findings: {
            orderBy: { createdAt: "asc" },
            take: 5
          }
        }
      });
    }

    return NextResponse.json({
      reports,
      meta: {
        agentId,
        includeArchived,
        days,
        limit,
        count: reports.length
      }
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
