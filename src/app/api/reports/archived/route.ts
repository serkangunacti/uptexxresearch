import { NextResponse } from "next/server";
import { getArchivedReports, restoreArchivedReport } from "@/lib/report-retention";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!agentId) {
    return NextResponse.json(
      { error: "agentId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const reports = await getArchivedReports(agentId, limit);

    return NextResponse.json({
      reports,
      meta: {
        agentId,
        limit,
        count: reports.length
      }
    });
  } catch (error) {
    console.error("Archived reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const reportId = searchParams.get('reportId');

  if (action === 'restore' && reportId) {
    try {
      const report = await restoreArchivedReport(reportId);
      return NextResponse.json({ report });
    } catch (error) {
      console.error("Report restore error:", error);
      return NextResponse.json(
        { error: "Failed to restore report" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid action or missing parameters" },
    { status: 400 }
  );
}