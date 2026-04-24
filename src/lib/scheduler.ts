import { RunStatus } from "@prisma/client";
import { AGENT_DEFINITIONS } from "./agent-definitions";
import { ensureAgents } from "./agents";
import { prisma } from "./db";
import { enqueueAgentRun } from "./queue";

export async function enqueueDueAgents(now = new Date()) {
  await ensureAgents();

  const dueAgents = AGENT_DEFINITIONS.filter((agent) => agent.status === "ACTIVE" && agent.schedule);
  const enqueued: string[] = [];

  for (const agent of dueAgents) {
    if (!agent.schedule) continue;
    if (!(await isAgentDue(agent.id, agent.schedule, now))) continue;

    await enqueueAgentRun(agent.id, "schedule");
    enqueued.push(agent.id);
  }

  return enqueued;
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
