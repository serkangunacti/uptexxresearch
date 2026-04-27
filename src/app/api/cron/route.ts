import { NextResponse } from "next/server";
import { ensureAgents } from "@/lib/agents";
import { AGENT_DEFINITIONS } from "@/lib/agent-definitions";
import { prisma } from "@/lib/db";
import { executeAgentRun } from "@/lib/runner";
import { schedulerEngine } from "@/lib/scheduling/scheduler-engine";
import { runRetentionCleanup } from "@/lib/report-retention";

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
  const results: { agentId: string; status: string; error?: string; reason?: string }[] = [];

  // Get all active agents
  const agents = await prisma.agent.findMany({
    where: { status: "ACTIVE" },
    include: { scheduleConfig: true }
  });

  for (const agent of agents) {
    try {
      // Check if agent should run using new scheduler
      const scheduleCheck = await schedulerEngine.shouldAgentRun(agent.id, now);

      if (!scheduleCheck.shouldRun) {
        // Record skipped execution
        await schedulerEngine.recordExecution(
          agent.id,
          now,
          now,
          scheduleCheck.reason || "Not scheduled",
          scheduleCheck.ruleId,
          "skipped",
          scheduleCheck.reason
        );
        continue;
      }

      // Create run and execute
      const run = await prisma.agentRun.create({
        data: {
          agentId: agent.id,
          status: "QUEUED",
          metadata: {
            reason: "schedule",
            ruleId: scheduleCheck.ruleId
          },
        },
      });

      const startTime = new Date();
      try {
        await executeAgentRun(agent.id, run.id);

        // Record successful execution
        await schedulerEngine.recordExecution(
          agent.id,
          now,
          startTime,
          scheduleCheck.reason || "Scheduled run",
          scheduleCheck.ruleId,
          "executed"
        );

        results.push({
          agentId: agent.id,
          status: "SUCCEEDED",
          reason: scheduleCheck.reason
        });
      } catch (error) {
        // Record failed execution
        await schedulerEngine.recordExecution(
          agent.id,
          now,
          startTime,
          scheduleCheck.reason || "Scheduled run",
          scheduleCheck.ruleId,
          "failed",
          error instanceof Error ? error.message : String(error)
        );

        results.push({
          agentId: agent.id,
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
          reason: scheduleCheck.reason
        });
      }
    } catch (error) {
      console.error(`Error processing agent ${agent.id}:`, error);
      results.push({
        agentId: agent.id,
        status: "ERROR",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Run retention cleanup
  let cleanupResult = null;
  try {
    cleanupResult = await runRetentionCleanup();
  } catch (error) {
    console.error("Retention cleanup error:", error);
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    executed: results.filter(r => r.status === "SUCCEEDED").length,
    skipped: results.filter(r => r.status === "ERROR" || r.status === "FAILED").length,
    results,
    cleanup: cleanupResult,
  });
}


