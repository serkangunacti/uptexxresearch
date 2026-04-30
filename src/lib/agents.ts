import { ProviderKind, UserRole } from "@prisma/client";
import { prisma } from "./db";
import { AGENT_TEMPLATE_SEEDS, DEFAULT_AGENT_SEEDS, getTemplateSeed } from "./agent-definitions";
import { passwordHashFor } from "./server-auth";

const DEFAULT_COMPANY = {
  name: "Kuzeytakip",
  slug: "kuzeytakip",
};

const DEFAULT_OWNER_EMAIL = "serkangunacti@kuzeytakip.com";

export async function ensureSystemData() {
  const company = await prisma.company.upsert({
    where: { slug: DEFAULT_COMPANY.slug },
    create: DEFAULT_COMPANY,
    update: { name: DEFAULT_COMPANY.name },
  });

  const ownerPassword = process.env.OWNER_ADMIN_PASSWORD;
  const ownerHash = ownerPassword ? await passwordHashFor(ownerPassword) : null;

  const owner = await prisma.user.upsert({
    where: { email: DEFAULT_OWNER_EMAIL },
    create: {
      companyId: company.id,
      email: DEFAULT_OWNER_EMAIL,
      name: "Serkan Gunacti",
      role: UserRole.OWNER_ADMIN,
      passwordHash: ownerHash,
      passwordSetAt: ownerHash ? new Date() : null,
    },
    update: {
      companyId: company.id,
      role: UserRole.OWNER_ADMIN,
      ...(ownerHash ? { passwordHash: ownerHash, passwordSetAt: new Date() } : {}),
    },
  });

  for (const template of AGENT_TEMPLATE_SEEDS) {
    await prisma.agentTemplate.upsert({
      where: { id: template.id },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        description: template.description,
        defaultPrompt: template.defaultPrompt,
        defaultQueries: template.defaultQueries,
        defaultTasks: template.defaultTasks,
        defaultSchedule: template.defaultSchedule,
        suggestedProvider: template.suggestedProvider,
      },
      update: {
        name: template.name,
        category: template.category,
        description: template.description,
        defaultPrompt: template.defaultPrompt,
        defaultQueries: template.defaultQueries,
        defaultTasks: template.defaultTasks,
        defaultSchedule: template.defaultSchedule,
        suggestedProvider: template.suggestedProvider,
      },
    });
  }

  await backfillLegacyData(company.id, owner.id);
  await ensureDefaultAgents(company.id);

  return { company, owner };
}

export async function ensureDefaultAgents(companyId: string) {
  for (const seed of DEFAULT_AGENT_SEEDS) {
    const template = getTemplateSeed(seed.templateId);
    if (!template) continue;

    const agent = await prisma.agent.upsert({
      where: { companyId_slug: { companyId, slug: seed.slug } },
      create: {
        companyId,
        templateId: template.id,
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        cadence: humanizeSchedule(template.defaultSchedule),
        scheduleLabel: humanizeSchedule(template.defaultSchedule),
        defaultPrompt: seed.defaultPrompt ?? template.defaultPrompt,
        searchQueries: seed.defaultQueries ?? template.defaultQueries,
        status: "ACTIVE",
        modelProvider: seed.modelProvider ?? template.suggestedProvider,
        modelName: seed.modelName ?? defaultModelFor(template.suggestedProvider),
      },
      update: {
        templateId: template.id,
        name: seed.name,
        description: seed.description,
        cadence: humanizeSchedule(template.defaultSchedule),
        scheduleLabel: humanizeSchedule(template.defaultSchedule),
        defaultPrompt: seed.defaultPrompt ?? template.defaultPrompt,
        searchQueries: seed.defaultQueries ?? template.defaultQueries,
        modelProvider: seed.modelProvider ?? template.suggestedProvider,
        modelName: seed.modelName ?? defaultModelFor(template.suggestedProvider),
      },
    });

    for (let index = 0; index < template.defaultTasks.length; index += 1) {
      const taskSeed = template.defaultTasks[index];
      const task = await prisma.task.upsert({
        where: { companyId_name: { companyId, name: taskSeed.name } },
        create: {
          companyId,
          name: taskSeed.name,
          category: taskSeed.category,
          description: taskSeed.description,
          instruction: taskSeed.instruction,
        },
        update: {
          category: taskSeed.category,
          description: taskSeed.description,
          instruction: taskSeed.instruction,
          isActive: true,
        },
      });

      await prisma.agentTask.upsert({
        where: { agentId_taskId: { agentId: agent.id, taskId: task.id } },
        create: {
          agentId: agent.id,
          taskId: task.id,
          sortOrder: index,
        },
        update: {
          sortOrder: index,
          isActive: true,
        },
      });
    }

    await prisma.agentSchedule.upsert({
      where: { agentId: agent.id },
      create: {
        companyId,
        agentId: agent.id,
        timezone: template.defaultSchedule.timezone,
        hour: template.defaultSchedule.hour,
        minute: template.defaultSchedule.minute,
        intervalDays: template.defaultSchedule.intervalDays ?? null,
        daysOfWeek: template.defaultSchedule.daysOfWeek ?? undefined,
      },
      update: {
        companyId,
        timezone: template.defaultSchedule.timezone,
        hour: template.defaultSchedule.hour,
        minute: template.defaultSchedule.minute,
        intervalDays: template.defaultSchedule.intervalDays ?? null,
        daysOfWeek: template.defaultSchedule.daysOfWeek ?? undefined,
        isActive: true,
      },
    });

    await prisma.agentRule.upsert({
      where: { agentId: agent.id },
      create: {
        companyId,
        agentId: agent.id,
        preventDuplicates: template.defaultRule.preventDuplicates,
        maxRunsPerDay: template.defaultRule.maxRunsPerDay,
        maxRunsPerWeek: template.defaultRule.maxRunsPerWeek,
        maxSourceAgeDays: template.defaultRule.maxSourceAgeDays,
        dedupeLookbackDays: template.defaultRule.dedupeLookbackDays,
      },
      update: {
        companyId,
      },
    });
  }
}

async function backfillLegacyData(companyId: string, ownerUserId: string) {
  await prisma.agent.updateMany({
    where: { companyId: null },
    data: { companyId },
  });

  await prisma.agentRun.updateMany({
    where: { companyId: null },
    data: { companyId, triggeredByUserId: ownerUserId },
  });

  await prisma.report.updateMany({
    where: { companyId: null },
    data: { companyId, triggeredByUserId: ownerUserId },
  });

  await prisma.reportFinding.updateMany({
    where: { companyId: null },
    data: { companyId },
  });
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

function defaultModelFor(provider: ProviderKind) {
  switch (provider) {
    case "ANTHROPIC":
      return "claude-3-5-sonnet-20241022";
    case "MINIMAX":
      return "MiniMax-M2.7";
    case "GLM":
      return "glm-4.5";
    case "GEMINI":
      return "gemini-2.0-flash";
    case "OPENAI":
      return "gpt-4.1-mini";
    case "CUSTOM_OPENAI":
      return "custom-model";
    case "OPENROUTER":
    default:
      return "openai/gpt-4.1-mini";
  }
}
