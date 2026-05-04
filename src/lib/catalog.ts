import {
  type AgentTemplate,
  type PackageKey,
  type Prisma,
  type SubscriptionStatus,
  type UserRole,
} from "@prisma/client";
import { prisma } from "./db";
import { isModelAllowed } from "./providers";
import type {
  CatalogSourceSeed,
  SessionUser,
  TemplateConfigFieldSeed,
  TemplateOutputSchemaSeed,
  TemplateRuleSeed,
  TemplateScheduleSeed,
  TemplateTaskSeed,
} from "./types";

const PACKAGE_ORDER: Record<PackageKey, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
  PREMIUM: 3,
};

export type SubscriptionSnapshot = {
  id: string;
  status: SubscriptionStatus;
  package: {
    id: string;
    key: PackageKey;
    name: string;
    monthlyPrice: number;
    currency: string;
    activeAgentLimit: number;
    allowsCustomAgentBuilder: boolean;
    sortOrder: number;
  };
};

export type CatalogTemplateView = {
  id: string;
  companyId: string | null;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  defaultQueries: string[];
  suggestedProvider: AgentTemplate["suggestedProvider"];
  origin: AgentTemplate["origin"];
  lifecycle: AgentTemplate["lifecycle"];
  isSelectable: boolean;
  sourceCatalog: CatalogSourceSeed[];
  taskBlueprints: TemplateTaskSeed[];
  configSchema: TemplateConfigFieldSeed[];
  outputSchema: TemplateOutputSchemaSeed;
  requiredPackageKey: PackageKey | null;
  requiredPackageName: string | null;
  accessible: boolean;
  locked: boolean;
  canInstall: boolean;
};

type TemplateWithPackages = Prisma.AgentTemplateGetPayload<{
  include: {
    packageLinks: {
      include: {
        package: true;
      };
    };
  };
}>;

type InstallTemplateInput = {
  user: SessionUser;
  templateId: string;
  credentialId: string;
  modelName: string;
  name?: string;
  config?: Record<string, unknown>;
};

export async function getCompanySubscription(companyId: string) {
  return prisma.companySubscription.findUnique({
    where: { companyId },
    include: {
      package: true,
    },
  });
}

export async function requireCompanySubscription(companyId: string): Promise<SubscriptionSnapshot> {
  const subscription = await getCompanySubscription(companyId);
  if (!subscription) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  return {
    id: subscription.id,
    status: subscription.status,
    package: {
      id: subscription.package.id,
      key: subscription.package.key,
      name: subscription.package.name,
      monthlyPrice: subscription.package.monthlyPrice,
      currency: subscription.package.currency,
      activeAgentLimit: subscription.package.activeAgentLimit,
      allowsCustomAgentBuilder: subscription.package.allowsCustomAgentBuilder,
      sortOrder: subscription.package.sortOrder,
    },
  };
}

export async function getCatalogTemplatesForUser(user: SessionUser) {
  const subscription = await requireCompanySubscription(user.companyId);
  const templates = await prisma.agentTemplate.findMany({
    where: {
      OR: [
        {
          origin: { in: ["SYSTEM", "GLOBAL_CUSTOM"] },
          lifecycle: { in: ["ACTIVE", "COMING_SOON"] },
        },
        {
          companyId: user.companyId,
          origin: "TENANT_CUSTOM",
          lifecycle: { in: ["ACTIVE", "COMING_SOON"] },
        },
      ],
    },
    include: {
      packageLinks: {
        include: {
          package: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return {
    subscription,
    templates: templates.map((template) => mapTemplateForUser(template, subscription)),
  };
}

export async function getCatalogTemplateForUser(user: SessionUser, templateId: string) {
  const subscription = await requireCompanySubscription(user.companyId);
  const template = await prisma.agentTemplate.findUnique({
    where: { id: templateId },
    include: {
      packageLinks: {
        include: {
          package: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error("NOT_FOUND");
  }

  if (
    template.origin === "TENANT_CUSTOM" &&
    template.companyId !== user.companyId
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    subscription,
    template: mapTemplateForUser(template, subscription),
  };
}

export async function installCatalogTemplate(input: InstallTemplateInput) {
  const { user, templateId, credentialId, modelName, name, config = {} } = input;
  const subscription = await requireCompanySubscription(user.companyId);
  const templateRecord = await prisma.agentTemplate.findUnique({
    where: { id: templateId },
    include: {
      packageLinks: {
        include: {
          package: true,
        },
      },
    },
  });

  if (!templateRecord) {
    throw new Error("NOT_FOUND");
  }

  const template = mapTemplateForUser(templateRecord, subscription);
  ensureInstallableTemplate(user, subscription, template);

  const credential = await prisma.apiCredential.findFirst({
    where: {
      id: credentialId,
      companyId: user.companyId,
      isActive: true,
    },
  });

  if (!credential) {
    throw new Error("INVALID_CREDENTIAL");
  }

  if (!isModelAllowed(credential, modelName)) {
    throw new Error("INVALID_MODEL");
  }

  await enforceActiveAgentLimit(user.companyId, subscription.package.activeAgentLimit);

  const normalizedConfig = normalizeTemplateConfig(template, config);
  const slug = await ensureUniqueAgentSlug(user.companyId, slugify(name || template.name));
  const searchQueries = buildTemplateQueries(template, normalizedConfig);
  const prompt = buildTemplatePrompt(template, normalizedConfig);
  const schedule = readSchedule(templateRecord.defaultSchedule);
  const rule = readRule(templateRecord.defaultRule);
  const selectedTasks = pickSelectedTasks(template.taskBlueprints, normalizedConfig.selectedTaskKeys);

  if (selectedTasks.length === 0) {
    throw new Error("TASK_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const taskIds: string[] = [];

    for (const task of selectedTasks) {
      const taskRecord = await tx.task.upsert({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name: task.name,
          },
        },
        create: {
          companyId: user.companyId,
          name: task.name,
          category: task.category,
          description: task.description,
          instruction: task.instruction,
        },
        update: {
          category: task.category,
          description: task.description,
          instruction: task.instruction,
          isActive: true,
        },
        select: { id: true },
      });
      taskIds.push(taskRecord.id);
    }

    const agent = await tx.agent.create({
      data: {
        companyId: user.companyId,
        templateId: templateRecord.id,
        credentialId,
        slug,
        name: (name || template.name).trim(),
        description: template.description,
        cadence: humanizeSchedule(schedule),
        scheduleLabel: humanizeSchedule(schedule),
        defaultPrompt: prompt,
        searchQueries,
        config: normalizedConfig,
        modelProvider: credential.provider,
        modelName,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await tx.agentSchedule.create({
      data: {
        companyId: user.companyId,
        agentId: agent.id,
        timezone: schedule.timezone,
        hour: schedule.hour,
        minute: schedule.minute,
        intervalDays: schedule.intervalDays ?? null,
        daysOfWeek: schedule.daysOfWeek ?? undefined,
        isActive: true,
      },
    });

    await tx.agentRule.create({
      data: {
        companyId: user.companyId,
        agentId: agent.id,
        preventDuplicates: rule.preventDuplicates,
        maxRunsPerDay: rule.maxRunsPerDay,
        maxRunsPerWeek: rule.maxRunsPerWeek,
        maxSourceAgeDays: rule.maxSourceAgeDays,
        dedupeLookbackDays: rule.dedupeLookbackDays,
      },
    });

    if (taskIds.length > 0) {
      await tx.agentTask.createMany({
        data: taskIds.map((taskId, index) => ({
          agentId: agent.id,
          taskId,
          sortOrder: index,
        })),
      });
    }

    return agent;
  });
}

export async function enforceActiveAgentLimit(companyId: string, activeAgentLimit: number, ignoreAgentId?: string) {
  if (activeAgentLimit >= 9999) return;

  const activeAgentCount = await prisma.agent.count({
    where: {
      companyId,
      status: "ACTIVE",
      ...(ignoreAgentId ? { id: { not: ignoreAgentId } } : {}),
    },
  });

  if (activeAgentCount >= activeAgentLimit) {
    throw new Error("AGENT_LIMIT_REACHED");
  }
}

export function assertPlatformAdmin(user: SessionUser) {
  if (!user.isPlatformAdmin) {
    throw new Error("FORBIDDEN");
  }
}

export function canCreateCustomTemplate(user: SessionUser, subscription: SubscriptionSnapshot) {
  return user.role === "OWNER_ADMIN" && subscription.package.allowsCustomAgentBuilder;
}

export function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueAgentSlug(companyId: string, baseSlug: string, ignoreAgentId?: string) {
  const safeBase = baseSlug || "ajan";
  let attempt = safeBase;
  let index = 2;

  while (true) {
    const existing = await prisma.agent.findFirst({
      where: {
        companyId,
        slug: attempt,
        ...(ignoreAgentId ? { id: { not: ignoreAgentId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return attempt;
    attempt = `${safeBase}-${index}`;
    index += 1;
  }
}

export function readSchedule(input: unknown): TemplateScheduleSeed {
  const value = isRecord(input) ? input : {};
  const daysOfWeek = Array.isArray(value.daysOfWeek)
    ? value.daysOfWeek.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
    : null;

  return {
    timezone: typeof value.timezone === "string" && value.timezone ? value.timezone : "Europe/Istanbul",
    hour: typeof value.hour === "number" ? value.hour : 9,
    minute: typeof value.minute === "number" ? value.minute : 0,
    intervalDays: typeof value.intervalDays === "number" ? value.intervalDays : null,
    daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : null,
  };
}

export function readRule(input: unknown): TemplateRuleSeed {
  const value = isRecord(input) ? input : {};
  return {
    preventDuplicates: value.preventDuplicates !== false,
    maxRunsPerDay: typeof value.maxRunsPerDay === "number" ? value.maxRunsPerDay : 1,
    maxRunsPerWeek: typeof value.maxRunsPerWeek === "number" ? value.maxRunsPerWeek : 7,
    maxSourceAgeDays: typeof value.maxSourceAgeDays === "number" ? value.maxSourceAgeDays : 7,
    dedupeLookbackDays: typeof value.dedupeLookbackDays === "number" ? value.dedupeLookbackDays : 7,
  };
}

function mapTemplateForUser(template: TemplateWithPackages, subscription: SubscriptionSnapshot): CatalogTemplateView {
  const requiredPackage = [...template.packageLinks]
    .sort((left, right) => left.package.sortOrder - right.package.sortOrder)[0]?.package ?? null;
  const tenantCustomRequiresPremium = template.origin === "TENANT_CUSTOM";
  const accessible = tenantCustomRequiresPremium
    ? subscription.package.allowsCustomAgentBuilder
    : !requiredPackage || PACKAGE_ORDER[subscription.package.key] >= PACKAGE_ORDER[requiredPackage.key];
  const comingSoon = template.lifecycle === "COMING_SOON";

  return {
    id: template.id,
    companyId: template.companyId,
    name: template.name,
    category: template.category,
    description: template.description,
    defaultPrompt: template.defaultPrompt,
    defaultQueries: readStringArray(template.defaultQueries),
    suggestedProvider: template.suggestedProvider,
    origin: template.origin,
    lifecycle: template.lifecycle,
    isSelectable: template.isSelectable,
    sourceCatalog: readSourceCatalog(template.sourceCatalog),
    taskBlueprints: readTaskBlueprints(template.taskBlueprints || template.defaultTasks),
    configSchema: readConfigSchema(template.configSchema),
    outputSchema: readOutputSchema(template.outputSchema),
    requiredPackageKey: requiredPackage?.key ?? null,
    requiredPackageName: requiredPackage?.name ?? null,
    accessible,
    locked: !accessible,
    canInstall: accessible && template.isSelectable && !comingSoon,
  };
}

function ensureInstallableTemplate(user: SessionUser, subscription: SubscriptionSnapshot, template: CatalogTemplateView) {
  if (user.role === "VIEWER") {
    throw new Error("FORBIDDEN");
  }
  if (template.origin === "TENANT_CUSTOM" && !subscription.package.allowsCustomAgentBuilder) {
    throw new Error("CUSTOM_TEMPLATE_RESTRICTED");
  }
  if (template.lifecycle === "COMING_SOON") {
    throw new Error("COMING_SOON");
  }
  if (!template.isSelectable || !template.accessible) {
    throw new Error("PACKAGE_RESTRICTED");
  }
}

function normalizeTemplateConfig(template: CatalogTemplateView, config: Record<string, unknown>) {
  const selectedSourceKeys = uniqueStringArray(config.selectedSourceKeys).filter((key) =>
    template.sourceCatalog.some((item) => item.key === key)
  );
  const selectedTaskKeys = uniqueStringArray(config.selectedTaskKeys).filter((key) =>
    template.taskBlueprints.some((item) => (item.key || slugify(item.name)) === key)
  );

  const fields = Object.fromEntries(
    template.configSchema.map((field) => {
      const raw = config[field.key];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !value) {
        throw new Error(`FIELD_REQUIRED:${field.key}`);
      }
      return [field.key, value || field.defaultValue || ""];
    })
  );

  if (template.id === "viral-content" && selectedSourceKeys.length === 0) {
    throw new Error("PLATFORM_REQUIRED");
  }

  if (template.id === "football-analysis" && selectedSourceKeys.length === 0) {
    throw new Error("LEAGUE_REQUIRED");
  }

  return {
    selectedSourceKeys: selectedSourceKeys.length > 0
      ? selectedSourceKeys
      : template.sourceCatalog.filter((item) => item.defaultSelected).map((item) => item.key),
    selectedTaskKeys: selectedTaskKeys.length > 0
      ? selectedTaskKeys
      : template.taskBlueprints
          .filter((item) => item.defaultSelected)
          .map((item) => item.key || slugify(item.name)),
    fields,
  };
}

function buildTemplatePrompt(template: CatalogTemplateView, config: ReturnType<typeof normalizeTemplateConfig>) {
  const selectedSources = template.sourceCatalog
    .filter((item) => config.selectedSourceKeys.includes(item.key))
    .map((item) => item.label);
  const selectedTasks = template.taskBlueprints
    .filter((item) => config.selectedTaskKeys.includes(item.key || slugify(item.name)))
    .map((item) => item.name);

  const sections = [
    template.defaultPrompt,
    selectedSources.length > 0 ? `Secilen kaynaklar/platformlar: ${selectedSources.join(", ")}` : "",
    selectedTasks.length > 0 ? `Secilen gorevler: ${selectedTasks.join(", ")}` : "",
    ...Object.entries(config.fields)
      .filter(([, value]) => value)
      .map(([key, value]) => `${findFieldLabel(template.configSchema, key)}: ${value}`),
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildTemplateQueries(template: CatalogTemplateView, config: ReturnType<typeof normalizeTemplateConfig>) {
  const selectedSources = template.sourceCatalog
    .filter((item) => config.selectedSourceKeys.includes(item.key))
    .map((item) => item.queryHint || item.label);
  const keywords = readTextLines(config.fields.focusKeywords);
  const customUrls = readTextLines(config.fields.customSourceUrls);
  const matchWeek = typeof config.fields.matchWeek === "string" ? config.fields.matchWeek.trim() : "";
  const minimumEngagement = typeof config.fields.minimumEngagement === "string" ? config.fields.minimumEngagement.trim() : "";

  const extraQueries: string[] = [];

  switch (template.id) {
    case "lead-research-tr":
      extraQueries.push(...keywords.map((keyword) => `${keyword} ${selectedSources.join(" ")} Turkiye firma iletisim`));
      break;
    case "lead-research-global":
      extraQueries.push(...keywords.map((keyword) => `${keyword} ${selectedSources.join(" ")} global company contacts`));
      break;
    case "general-news-research":
      extraQueries.push(...keywords.map((keyword) => `${keyword} technology news last 7 days`));
      break;
    case "crypto-research":
      extraQueries.push(...keywords.map((keyword) => `${keyword} crypto market signal last 7 days`));
      break;
    case "it-research":
      extraQueries.push(...keywords.map((keyword) => `${keyword} enterprise IT news last 7 days`));
      break;
    case "finance-research":
      extraQueries.push(...keywords.map((keyword) => `${keyword} finance market outlook last 7 days`));
      break;
    case "football-analysis":
      extraQueries.push(
        ...selectedSources.map((source) => `${source} football fixtures injuries suspensions ${matchWeek || "this week"}`)
      );
      extraQueries.push(...keywords.map((keyword) => `${keyword} football match preview injuries last 7 days`));
      break;
    case "viral-content":
      extraQueries.push(
        ...selectedSources.map((source) => `${source} viral content ${minimumEngagement || "high engagement"} last 7 days`)
      );
      extraQueries.push(...keywords.map((keyword) => `${keyword} viral social content last 7 days`));
      break;
    default:
      break;
  }

  extraQueries.push(...customUrls);

  return uniqueStringArray([...template.defaultQueries, ...extraQueries]);
}

function pickSelectedTasks(tasks: TemplateTaskSeed[], selectedTaskKeys: string[]) {
  const fallbackKeys = tasks
    .filter((task) => task.defaultSelected)
    .map((task) => task.key || slugify(task.name));
  const activeKeys = selectedTaskKeys.length > 0 ? selectedTaskKeys : fallbackKeys;

  return tasks.filter((task) => activeKeys.includes(task.key || slugify(task.name)));
}

function readTaskBlueprints(input: unknown): TemplateTaskSeed[] {
  if (!Array.isArray(input)) return [];

  const tasks: TemplateTaskSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) continue;
    tasks.push({
      key: typeof item.key === "string" && item.key ? item.key : slugify(name),
      name,
      category: typeof item.category === "string" && item.category ? item.category : "general",
      description: typeof item.description === "string" ? item.description : name,
      instruction: typeof item.instruction === "string" ? item.instruction : name,
      defaultSelected: item.defaultSelected !== false,
    });
  }

  return tasks;
}

function readSourceCatalog(input: unknown): CatalogSourceSeed[] {
  if (!Array.isArray(input)) return [];

  const sources: CatalogSourceSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const key = typeof item.key === "string" ? item.key : "";
    const label = typeof item.label === "string" ? item.label : "";
    if (!key || !label) continue;
    sources.push({
      key,
      label,
      description: typeof item.description === "string" ? item.description : label,
      queryHint: typeof item.queryHint === "string" ? item.queryHint : undefined,
      defaultSelected: item.defaultSelected === true,
    });
  }

  return sources;
}

function readConfigSchema(input: unknown): TemplateConfigFieldSeed[] {
  if (!Array.isArray(input)) return [];

  const fields: TemplateConfigFieldSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const key = typeof item.key === "string" ? item.key : "";
    const label = typeof item.label === "string" ? item.label : "";
    const type = item.type === "text" || item.type === "textarea" ? item.type : null;
    if (!key || !label || !type) continue;
    fields.push({
      key,
      label,
      type,
      placeholder: typeof item.placeholder === "string" ? item.placeholder : undefined,
      helpText: typeof item.helpText === "string" ? item.helpText : undefined,
      required: item.required === true,
      defaultValue: typeof item.defaultValue === "string" ? item.defaultValue : undefined,
    });
  }

  return fields;
}

function readOutputSchema(input: unknown): TemplateOutputSchemaSeed {
  if (!isRecord(input)) return {};

  return {
    findingKind: isFindingKind(input.findingKind) ? input.findingKind : undefined,
    requiredMetadataFields: Array.isArray(input.requiredMetadataFields)
      ? input.requiredMetadataFields.map((item) => String(item)).filter(Boolean)
      : undefined,
    metadataLabels: isRecord(input.metadataLabels)
      ? Object.fromEntries(Object.entries(input.metadataLabels).map(([key, value]) => [key, String(value)]))
      : undefined,
  };
}

function findFieldLabel(fields: TemplateConfigFieldSeed[], key: string) {
  return fields.find((field) => field.key === key)?.label ?? key;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function readTextLines(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFindingKind(value: unknown): value is "LEAD" | "OPPORTUNITY" | "NEWS" | "MARKET_SIGNAL" | "SYSTEM" {
  return value === "LEAD" || value === "OPPORTUNITY" || value === "NEWS" || value === "MARKET_SIGNAL" || value === "SYSTEM";
}

export function humanizeSchedule(schedule: TemplateScheduleSeed) {
  const hh = String(schedule.hour).padStart(2, "0");
  const mm = String(schedule.minute).padStart(2, "0");
  if (schedule.intervalDays && schedule.intervalDays > 1) {
    return `${schedule.intervalDays} gunde bir ${hh}:${mm}`;
  }
  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    return `Haftalik plan ${hh}:${mm}`;
  }
  return `Her gun ${hh}:${mm}`;
}
