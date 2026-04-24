import { NextResponse } from "next/server";
import { ensureAgents } from "@/lib/agents";
import { AGENT_DEFINITIONS } from "@/lib/agent-definitions";
import { prisma } from "@/lib/db";
import { executeAgentRun } from "@/lib/runner";
import { RunStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro: 300s, Hobby: 60s

// Vercel Cron calls this endpoint on schedule
export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAgents();

  const now = new Date();
  const results: { agentId: string; status: string; error?: string }[] = [];

  for (const agentDef of AGENT_DEFINITIONS) {
    if (agentDef.status !== "ACTIVE" || !agentDef.schedule) continue;

    // Check if agent is due
    const isDue = await isAgentDue(agentDef.id, agentDef.schedule, now);
    if (!isDue) continue;

    // Create run and execute
    const run = await prisma.agentRun.create({
      data: {
        agentId: agentDef.id,
        status: "QUEUED",
        metadata: { reason: "schedule" },
      },
    });

    try {
      await executeAgentRun(agentDef.id, run.id);
      results.push({ agentId: agentDef.id, status: "SUCCEEDED" });
    } catch (error) {
      results.push({
        agentId: agentDef.id,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    executed: results.length,
    results,
  });
}

async function isAgentDue(
  agentId: string,
  schedule: { hour: number; minute: number; everyDays: number },
  now: Date
) {
  const targetToday = new Date(now);
  targetToday.setHours(schedule.hour, schedule.minute, 0, 0);
  if (now < targetToday) return false;

  const latestRun = await prisma.agentRun.findFirst({
    where: {
      agentId,
      status: { in: [RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.SUCCEEDED] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestRun) return true;
  if (latestRun.createdAt >= targetToday) return false;

  const elapsed = now.getTime() - latestRun.createdAt.getTime();
  return elapsed >= schedule.everyDays * 24 * 60 * 60 * 1000;
}
