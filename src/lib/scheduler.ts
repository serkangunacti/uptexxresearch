import { RunStatus } from "@prisma/client";
import { AGENT_DEFINITIONS } from "./agent-definitions";
import { ensureAgents } from "./agents";
import { prisma } from "./db";
import { dispatchAgentRun } from "./github-actions";

export type ScheduledRunResult = {
  agentId: string;
  status: "QUEUED" | "FAILED";
  error?: string;
};

export async function scheduleDueAgents(now = new Date()) {
  await ensureAgents();

  const dueAgents = AGENT_DEFINITIONS.filter((agent) => agent.status === "ACTIVE" && agent.schedule);
  const results: ScheduledRunResult[] = [];

  for (const agent of dueAgents) {
    if (!agent.schedule) continue;
    if (!(await isAgentDue(agent.id, agent.schedule, now))) continue;

    const run = await prisma.agentRun.create({
      data: {
        agentId: agent.id,
        status: "QUEUED",
        metadata: { reason: "schedule" },
      },
    });

    try {
      await dispatchAgentRun(agent.id, run.id);
      results.push({ agentId: agent.id, status: "QUEUED" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: message,
          metadata: { reason: "schedule", error: message },
        },
      });

      results.push({
        agentId: agent.id,
        status: "FAILED",
        error: message,
      });
    }
  }

  return results;
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
      status: { in: [RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.SUCCEEDED] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!latestRun) return true;
  if (latestRun.createdAt >= targetToday) return false;

  const elapsed = now.getTime() - latestRun.createdAt.getTime();
  return elapsed >= schedule.everyDays * 24 * 60 * 60 * 1000;
}
