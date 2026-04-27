import { NextResponse } from "next/server";
import { scheduleDueAgents } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Manual or external scheduler trigger
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = await scheduleDueAgents(now);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    executed: results.length,
    results,
  });
}
