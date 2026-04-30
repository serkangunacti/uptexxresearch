import { RunStatus } from "@prisma/client";
import { prisma } from "./db";
import { resolveCredentialForAgent } from "./credentials";
import { dispatchAgentRun } from "./github-actions";

export type ScheduledRunResult = {
  agentId: string;
  status: "QUEUED" | "FAILED" | "BLOCKED";
  error?: string;
};

export async function scheduleDueAgents(now = new Date()) {
  const agents = await prisma.agent.findMany({
    where: { status: "ACTIVE", companyId: { not: null } },
    include: { schedule: true, rule: true, credential: true },
  });

  const results: ScheduledRunResult[] = [];

  for (const agent of agents) {
    if (!agent.companyId || !agent.schedule?.isActive) continue;
    if (!(await isAgentDue(agent.id, agent.schedule, now))) continue;
    if (!(await isUnderRunLimits(agent.id, agent.companyId, agent.rule, now))) continue;

    if (!agent.credentialId || !agent.modelName) {
      await prisma.agentRun.create({
        data: {
          companyId: agent.companyId,
          agentId: agent.id,
          status: "BLOCKED",
          error: "Bu ajan için aktif API key veya model seçimi eksik.",
          metadata: { reason: "schedule", blocked: true },
          finishedAt: new Date(),
        },
      });
      results.push({
        agentId: agent.id,
        status: "BLOCKED",
        error: "Bu ajan için aktif API key veya model seçimi eksik.",
      });
      continue;
    }

    try {
      await resolveCredentialForAgent({
        companyId: agent.companyId,
        credentialId: agent.credentialId,
        modelName: agent.modelName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "API key doğrulanamadı.";
      await prisma.agentRun.create({
        data: {
          companyId: agent.companyId,
          agentId: agent.id,
          status: "BLOCKED",
          error: message,
          metadata: { reason: "schedule", blocked: true },
          finishedAt: new Date(),
        },
      });
      results.push({ agentId: agent.id, status: "BLOCKED", error: message });
      continue;
    }

    const run = await prisma.agentRun.create({
      data: {
        companyId: agent.companyId,
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
      results.push({ agentId: agent.id, status: "FAILED", error: message });
    }
  }

  return results;
}

async function isAgentDue(
  agentId: string,
  schedule: {
    timezone: string;
    hour: number;
    minute: number;
    intervalDays: number | null;
    daysOfWeek: unknown;
  },
  now: Date
) {
  const local = toLocalParts(now, schedule.timezone);
  if (local.hour < schedule.hour || (local.hour === schedule.hour && local.minute < schedule.minute)) {
    return false;
  }

  const latestRun = await prisma.agentRun.findFirst({
    where: {
      agentId,
      status: { in: [RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.SUCCEEDED] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (schedule.intervalDays && schedule.intervalDays > 1) {
    if (!latestRun) return true;
    const lastLocal = toLocalParts(latestRun.createdAt, schedule.timezone);
    if (lastLocal.dayKey === local.dayKey) return false;
    const elapsed = now.getTime() - latestRun.createdAt.getTime();
    return elapsed >= schedule.intervalDays * 24 * 60 * 60 * 1000;
  }

  const weekdays = readWeekdays(schedule.daysOfWeek);
  if (weekdays.length > 0 && !weekdays.includes(local.weekday)) {
    return false;
  }

  if (!latestRun) return true;
  return toLocalParts(latestRun.createdAt, schedule.timezone).dayKey !== local.dayKey;
}

async function isUnderRunLimits(
  agentId: string,
  companyId: string,
  rule: {
    maxRunsPerDay: number;
    maxRunsPerWeek: number;
  } | null,
  now: Date
) {
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [dailyCount, weeklyCount] = await Promise.all([
    prisma.agentRun.count({
      where: {
        companyId,
        agentId,
        createdAt: { gte: dayStart },
        status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] },
      },
    }),
    prisma.agentRun.count({
      where: {
        companyId,
        agentId,
        createdAt: { gte: weekStart },
        status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] },
      },
    }),
  ]);

  return dailyCount < (rule?.maxRunsPerDay ?? 1) && weeklyCount < (rule?.maxRunsPerWeek ?? 7);
}

function readWeekdays(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    : [];
}

function toLocalParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekday: weekdayMap[parts.weekday ?? "Sun"] ?? 0,
    hour: Number(parts.hour ?? 0),
    minute: Number(parts.minute ?? 0),
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}
