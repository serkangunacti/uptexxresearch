import { UserRole } from "@prisma/client";
import { prisma } from "./db";
import { AGENT_TEMPLATE_SEEDS, PACKAGE_SEEDS } from "./agent-definitions";
import { passwordHashFor } from "./server-auth";

const DEFAULT_COMPANY = {
  name: "Kuzeytakip",
  slug: "kuzeytakip",
};

const DEFAULT_OWNER_EMAIL = "serkangunacti@kuzeytakip.com";
const DEFAULT_PACKAGE_KEY = "PREMIUM" as const;

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
      isPlatformAdmin: true,
      ...(ownerHash ? { passwordHash: ownerHash, passwordSetAt: new Date() } : {}),
    },
  });

  for (const pkg of PACKAGE_SEEDS) {
    await prisma.planPackage.upsert({
      where: { key: pkg.key },
      create: {
        key: pkg.key,
        name: pkg.name,
        monthlyPrice: pkg.monthlyPrice,
        currency: pkg.currency,
        activeAgentLimit: pkg.activeAgentLimit,
        allowsCustomAgentBuilder: pkg.allowsCustomAgentBuilder,
        sortOrder: pkg.sortOrder,
        isActive: pkg.isActive ?? true,
      },
      update: {
        name: pkg.name,
        monthlyPrice: pkg.monthlyPrice,
        currency: pkg.currency,
        activeAgentLimit: pkg.activeAgentLimit,
        allowsCustomAgentBuilder: pkg.allowsCustomAgentBuilder,
        sortOrder: pkg.sortOrder,
        isActive: pkg.isActive ?? true,
      },
    });
  }

  const defaultPackage = await prisma.planPackage.findUnique({
    where: { key: DEFAULT_PACKAGE_KEY },
    select: { id: true },
  });

  if (defaultPackage) {
    const existingSubscription = await prisma.companySubscription.findUnique({
      where: { companyId: company.id },
      select: { id: true },
    });

    if (!existingSubscription) {
      await prisma.companySubscription.create({
        data: {
          companyId: company.id,
          packageId: defaultPackage.id,
          status: "ACTIVE",
        },
      });
    }
  }

  const packageMap = new Map(
    (await prisma.planPackage.findMany({
      select: { id: true, key: true },
    })).map((pkg) => [pkg.key, pkg.id])
  );

  for (const template of AGENT_TEMPLATE_SEEDS) {
    const taskBlueprints = template.taskBlueprints ?? template.defaultTasks;

    await prisma.agentTemplate.upsert({
      where: { id: template.id },
      create: {
        id: template.id,
        companyId: template.companyId ?? null,
        name: template.name,
        category: template.category,
        description: template.description,
        defaultPrompt: template.defaultPrompt,
        defaultQueries: template.defaultQueries,
        defaultTasks: template.defaultTasks,
        defaultSchedule: template.defaultSchedule,
        defaultRule: template.defaultRule,
        suggestedProvider: template.suggestedProvider,
        origin: template.origin ?? "SYSTEM",
        lifecycle: template.lifecycle ?? "ACTIVE",
        isSelectable: template.isSelectable ?? true,
        configSchema: template.configSchema ?? [],
        sourceCatalog: template.sourceCatalog ?? [],
        taskBlueprints,
        outputSchema: template.outputSchema ?? {},
      },
      update: {
        companyId: template.companyId ?? null,
        name: template.name,
        category: template.category,
        description: template.description,
        defaultPrompt: template.defaultPrompt,
        defaultQueries: template.defaultQueries,
        defaultTasks: template.defaultTasks,
        defaultSchedule: template.defaultSchedule,
        defaultRule: template.defaultRule,
        suggestedProvider: template.suggestedProvider,
        origin: template.origin ?? "SYSTEM",
        lifecycle: template.lifecycle ?? "ACTIVE",
        isSelectable: template.isSelectable ?? true,
        configSchema: template.configSchema ?? [],
        sourceCatalog: template.sourceCatalog ?? [],
        taskBlueprints,
        outputSchema: template.outputSchema ?? {},
      },
    });

    await prisma.planPackageAgentTemplate.deleteMany({
      where: { templateId: template.id },
    });

    if (template.visibilityPackageKey) {
      const packageId = packageMap.get(template.visibilityPackageKey);
      if (packageId) {
        await prisma.planPackageAgentTemplate.create({
          data: {
            packageId,
            templateId: template.id,
          },
        });
      }
    }
  }

  await backfillLegacyData(company.id, owner.id);

  return { company, owner };
}
async function backfillLegacyData(companyId: string, ownerUserId: string) {
  await prisma.agentTemplate.updateMany({
    where: {
      id: { notIn: AGENT_TEMPLATE_SEEDS.map((item) => item.id) },
      companyId: null,
    },
    data: {
      lifecycle: "DRAFT",
      isSelectable: false,
    },
  });

  await prisma.agent.updateMany({
    where: { companyId: null },
    data: { companyId, config: {} },
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
