import { UserRole } from "@prisma/client";
import { prisma } from "./db";
import { AGENT_TEMPLATE_SEEDS } from "./agent-definitions";
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

  return { company, owner };
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
