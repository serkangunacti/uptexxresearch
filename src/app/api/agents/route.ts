import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisibleAgentsForUser } from "@/lib/access";
import { getTemplateSeed } from "@/lib/agent-definitions";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser("VIEWER");
    const agents = await getVisibleAgentsForUser(session.user);
    return NextResponse.json({ agents });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ agents: [] }, { status: 401 });
    }
    return NextResponse.json({ agents: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser("OWNER_ADMIN");
    const body = await request.json();
    const templateId = String(body.templateId || "");
    const template = await prisma.agentTemplate.findUnique({ where: { id: templateId } });
    const seed = getTemplateSeed(templateId);

    if (!template || !seed) {
      return NextResponse.json({ error: "Şablon bulunamadı." }, { status: 404 });
    }

    const slug = String(body.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Slug zorunlu." }, { status: 400 });
    }

    const credentialId = body.credentialId ? String(body.credentialId) : null;
    if (credentialId) {
      const credential = await prisma.apiCredential.findFirst({
        where: { id: credentialId, companyId: session.user.companyId, isActive: true },
      });
      if (!credential) {
        return NextResponse.json({ error: "Seçili API key bu tenant için geçerli değil." }, { status: 400 });
      }
    }

    const taskIds = Array.isArray(body.taskIds) ? body.taskIds.map((value: unknown) => String(value)) : [];
    const validTasks = taskIds.length
      ? await prisma.task.findMany({
          where: { companyId: session.user.companyId, id: { in: taskIds } },
          select: { id: true },
        })
      : [];
    const validTaskIds = validTasks.map((task) => task.id);

    const assignmentIds = Array.isArray(body.assignmentUserIds)
      ? body.assignmentUserIds.map((value: unknown) => String(value))
      : [];
    const validAssignments = assignmentIds.length
      ? await prisma.user.findMany({
          where: {
            companyId: session.user.companyId,
            role: "MANAGER",
            id: { in: assignmentIds },
          },
          select: { id: true },
        })
      : [];
    const validAssignmentIds = validAssignments.map((user) => user.id);

    const agent = await prisma.agent.create({
      data: {
        companyId: session.user.companyId,
        templateId: template.id,
        slug,
        name: String(body.name || template.name),
        description: String(body.description || template.description),
        cadence: humanizeSchedule(seed.defaultSchedule),
        scheduleLabel: humanizeSchedule(seed.defaultSchedule),
        defaultPrompt: String(body.defaultPrompt || template.defaultPrompt),
        searchQueries: parseList(body.searchQueries) || seed.defaultQueries,
        status: body.status === "PAUSED" ? "PAUSED" : "ACTIVE",
        modelProvider: body.modelProvider || template.suggestedProvider,
        modelName: String(body.modelName || ""),
        credentialId,
      },
    });

    await prisma.agentSchedule.create({
      data: {
        companyId: session.user.companyId,
        agentId: agent.id,
        timezone: String(body.timezone || seed.defaultSchedule.timezone),
        hour: Number(body.hour ?? seed.defaultSchedule.hour),
        minute: Number(body.minute ?? seed.defaultSchedule.minute),
        intervalDays: body.intervalDays ? Number(body.intervalDays) : seed.defaultSchedule.intervalDays ?? null,
        daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek : seed.defaultSchedule.daysOfWeek ?? undefined,
        isActive: body.scheduleActive !== false,
      },
    });

    await prisma.agentRule.create({
      data: {
        companyId: session.user.companyId,
        agentId: agent.id,
        preventDuplicates: body.preventDuplicates ?? seed.defaultRule.preventDuplicates,
        maxRunsPerDay: Number(body.maxRunsPerDay ?? seed.defaultRule.maxRunsPerDay),
        maxRunsPerWeek: Number(body.maxRunsPerWeek ?? seed.defaultRule.maxRunsPerWeek),
        maxSourceAgeDays: Number(body.maxSourceAgeDays ?? seed.defaultRule.maxSourceAgeDays),
        dedupeLookbackDays: Number(body.dedupeLookbackDays ?? seed.defaultRule.dedupeLookbackDays),
      },
    });

    if (validTaskIds.length > 0) {
      await prisma.agentTask.createMany({
        data: validTaskIds.map((taskId: string, index: number) => ({
          agentId: agent.id,
          taskId,
          sortOrder: index,
        })),
      });
    }

    if (validAssignmentIds.length > 0) {
      await prisma.agentAssignment.createMany({
        data: validAssignmentIds.map((userId: string) => ({
          agentId: agent.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, agentId: agent.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
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

function humanizeSchedule(schedule: { hour: number; minute: number; intervalDays?: number | null; daysOfWeek?: number[] | null }) {
  const hh = String(schedule.hour).padStart(2, "0");
  const mm = String(schedule.minute).padStart(2, "0");
  if (schedule.intervalDays && schedule.intervalDays > 1) {
    return `${schedule.intervalDays} günde bir ${hh}:${mm}`;
  }
  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    return `Haftalık plan ${hh}:${mm}`;
  }
  return `Her gün ${hh}:${mm}`;
}
