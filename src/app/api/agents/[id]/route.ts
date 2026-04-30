import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAgentForUser } from "@/lib/access";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser("VIEWER");
    const { id } = await context.params;
    const agent = await getAgentForUser(session.user, id, "view");
    return NextResponse.json({ agent });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser("MANAGER");
    const { id } = await context.params;
    const agent = await getAgentForUser(session.user, id, "manage");
    const body = await request.json();
    const credentialId = body.credentialId ? String(body.credentialId) : null;
    if (credentialId) {
      const credential = await prisma.apiCredential.findFirst({
        where: { id: credentialId, companyId: session.user.companyId, isActive: true },
      });
      if (!credential) {
        return NextResponse.json({ error: "Seçili API key bu tenant için geçerli değil." }, { status: 400 });
      }
    }

    const nextHour = Number(body.hour ?? agent.schedule?.hour ?? 9);
    const nextMinute = Number(body.minute ?? agent.schedule?.minute ?? 0);
    const nextIntervalDays = body.intervalDays ? Number(body.intervalDays) : null;
    const nextDaysOfWeek = Array.isArray(body.daysOfWeek) ? body.daysOfWeek : null;
    const nextSearchQueries = parseList(body.searchQueries);

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: body.name ? String(body.name) : agent.name,
        description: body.description ? String(body.description) : agent.description,
        defaultPrompt: body.defaultPrompt ? String(body.defaultPrompt) : agent.defaultPrompt,
        searchQueries:
          nextSearchQueries ??
          (agent.searchQueries === null ? Prisma.JsonNull : (agent.searchQueries as Prisma.InputJsonValue)),
        status: body.status === "PAUSED" ? "PAUSED" : "ACTIVE",
        modelProvider: body.modelProvider || null,
        modelName: body.modelName ? String(body.modelName) : null,
        credentialId,
        cadence: humanizeSchedule(nextHour, nextMinute, nextIntervalDays, nextDaysOfWeek),
        scheduleLabel: humanizeSchedule(nextHour, nextMinute, nextIntervalDays, nextDaysOfWeek),
      },
    });

    if (agent.schedule) {
      await prisma.agentSchedule.update({
        where: { agentId: agent.id },
        data: {
          timezone: String(body.timezone || agent.schedule.timezone),
          hour: nextHour,
          minute: nextMinute,
          intervalDays: nextIntervalDays,
          daysOfWeek: nextDaysOfWeek,
          isActive: body.scheduleActive !== false,
        },
      });
    }

    if (agent.rule) {
      await prisma.agentRule.update({
        where: { agentId: agent.id },
        data: {
          preventDuplicates: body.preventDuplicates ?? agent.rule.preventDuplicates,
          maxRunsPerDay: Number(body.maxRunsPerDay ?? agent.rule.maxRunsPerDay),
          maxRunsPerWeek: Number(body.maxRunsPerWeek ?? agent.rule.maxRunsPerWeek),
          maxSourceAgeDays: Number(body.maxSourceAgeDays ?? agent.rule.maxSourceAgeDays),
          dedupeLookbackDays: Number(body.dedupeLookbackDays ?? agent.rule.dedupeLookbackDays),
        },
      });
    }

    const taskIds = Array.isArray(body.taskIds) ? body.taskIds.map((value: unknown) => String(value)) : null;
    if (taskIds) {
      const validTasks = await prisma.task.findMany({
        where: { companyId: session.user.companyId, id: { in: taskIds } },
        select: { id: true },
      });
      await prisma.agentTask.deleteMany({ where: { agentId: agent.id } });
      if (validTasks.length > 0) {
        await prisma.agentTask.createMany({
          data: validTasks.map((task, index: number) => ({
            agentId: agent.id,
            taskId: task.id,
            sortOrder: index,
          })),
        });
      }
    }

    if (session.user.role === "OWNER_ADMIN") {
      const assignmentIds = Array.isArray(body.assignmentUserIds)
        ? body.assignmentUserIds.map((value: unknown) => String(value))
        : null;
      if (assignmentIds) {
        const validAssignments = await prisma.user.findMany({
          where: {
            companyId: session.user.companyId,
            role: "MANAGER",
            id: { in: assignmentIds },
          },
          select: { id: true },
        });
        await prisma.agentAssignment.deleteMany({ where: { agentId: agent.id } });
        if (validAssignments.length > 0) {
          await prisma.agentAssignment.createMany({
            data: validAssignments.map((user) => ({ agentId: agent.id, userId: user.id })),
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function parseList(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return null;
}

function humanizeSchedule(hour: number, minute: number, intervalDays: number | null, daysOfWeek: unknown) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  if (intervalDays && intervalDays > 1) {
    return `${intervalDays} günde bir ${hh}:${mm}`;
  }
  if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
    return `Haftalık plan ${hh}:${mm}`;
  }
  return `Her gün ${hh}:${mm}`;
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
}
