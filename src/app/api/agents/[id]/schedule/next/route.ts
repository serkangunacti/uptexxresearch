import { NextResponse } from "next/server";
import { schedulerEngine } from "@/lib/scheduling/scheduler-engine";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const nextRun = await schedulerEngine.getNextScheduledRun(id);

    return NextResponse.json({
      nextRun: nextRun?.toISOString() || null
    });
  } catch (error) {
    console.error("Next run fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch next run" },
      { status: 500 }
    );
  }
}