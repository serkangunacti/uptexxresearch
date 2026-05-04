import type { AgentTemplateSeed, CatalogSourceSeed, TemplateConfigFieldSeed, TemplateTaskSeed } from "./types";
import { slugify } from "./catalog";

type BuildTemplateInput = {
  name: string;
  description: string;
  category?: string;
  defaultPrompt: string;
  defaultQueries?: unknown;
  tasks?: unknown;
  sources?: unknown;
  configFields?: unknown;
  requiredMetadataFields?: unknown;
  outputFindingKind?: unknown;
  suggestedProvider?: unknown;
  visibilityPackageKey?: unknown;
  schedule?: unknown;
  rule?: unknown;
  companyId?: string | null;
  origin: AgentTemplateSeed["origin"];
};

export function buildCustomTemplateSeed(input: BuildTemplateInput): AgentTemplateSeed {
  const name = String(input.name || "").trim();
  const defaultPrompt = String(input.defaultPrompt || "").trim();

  if (!name || !defaultPrompt) {
    throw new Error("TEMPLATE_NAME_AND_PROMPT_REQUIRED");
  }

  const tasks = parseTasks(input.tasks);
  if (tasks.length === 0) {
    throw new Error("TEMPLATE_TASK_REQUIRED");
  }

  const sources = parseSources(input.sources);
  const configFields = parseConfigFields(input.configFields);
  const requiredMetadataFields = parseTextLines(input.requiredMetadataFields);

  return {
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyId: input.companyId ?? null,
    name,
    category: String(input.category || "custom").trim() || "custom",
    description: String(input.description || name).trim() || name,
    defaultPrompt,
    defaultQueries: parseTextLines(input.defaultQueries),
    defaultTasks: tasks,
    taskBlueprints: tasks,
    sourceCatalog: sources,
    configSchema: configFields.length > 0 ? configFields : defaultConfigFields(),
    outputSchema: {
      findingKind: isFindingKind(input.outputFindingKind) ? input.outputFindingKind : undefined,
      requiredMetadataFields: requiredMetadataFields.length > 0 ? requiredMetadataFields : undefined,
      metadataLabels:
        requiredMetadataFields.length > 0
          ? Object.fromEntries(requiredMetadataFields.map((field) => [field, field]))
          : undefined,
    },
    defaultSchedule: parseSchedule(input.schedule),
    defaultRule: parseRule(input.rule),
    suggestedProvider: isProvider(input.suggestedProvider) ? input.suggestedProvider : "OPENROUTER",
    origin: input.origin,
    lifecycle: "ACTIVE",
    isSelectable: true,
    visibilityPackageKey: isPackageKey(input.visibilityPackageKey) ? input.visibilityPackageKey : "PREMIUM",
  };
}

function parseTasks(input: unknown): TemplateTaskSeed[] {
  if (!Array.isArray(input)) return [];

  const tasks: TemplateTaskSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const name = String(item.name || "").trim();
    const instruction = String(item.instruction || "").trim();
    if (!name || !instruction) continue;

    tasks.push({
      key: String(item.key || slugify(name)),
      name,
      category: String(item.category || "custom").trim() || "custom",
      description: String(item.description || name).trim() || name,
      instruction,
      defaultSelected: item.defaultSelected !== false,
    });
  }

  return tasks;
}

function parseSources(input: unknown): CatalogSourceSeed[] {
  if (!Array.isArray(input)) return [];

  const sources: CatalogSourceSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const label = String(item.label || "").trim();
    if (!label) continue;

    sources.push({
      key: String(item.key || slugify(label)),
      label,
      description: String(item.description || label).trim() || label,
      queryHint: String(item.queryHint || "").trim() || undefined,
      defaultSelected: item.defaultSelected !== false,
    });
  }

  return sources;
}

function parseConfigFields(input: unknown): TemplateConfigFieldSeed[] {
  if (!Array.isArray(input)) return [];

  const fields: TemplateConfigFieldSeed[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const key = String(item.key || "").trim();
    const label = String(item.label || "").trim();
    const type = item.type === "text" || item.type === "textarea" ? item.type : null;
    if (!key || !label || !type) continue;

    fields.push({
      key,
      label,
      type,
      placeholder: String(item.placeholder || "").trim() || undefined,
      helpText: String(item.helpText || "").trim() || undefined,
      required: item.required === true,
      defaultValue: String(item.defaultValue || "").trim() || undefined,
    });
  }

  return fields;
}

function defaultConfigFields(): TemplateConfigFieldSeed[] {
  return [
    {
      key: "focusKeywords",
      label: "Odak kelimeler",
      type: "textarea",
      placeholder: "Her satira bir kelime veya konu yaz",
      helpText: "Kurulum sirasinda bu ajanin odaklanacagi basliklar girilir.",
    },
    {
      key: "customSourceUrls",
      label: "Ek kaynak URL'leri",
      type: "textarea",
      placeholder: "https://...",
      helpText: "Kurulum sirasinda ekstra kaynaklar eklenebilir.",
    },
  ];
}

function parseSchedule(input: unknown) {
  const value = isRecord(input) ? input : {};
  const daysOfWeek = Array.isArray(value.daysOfWeek)
    ? value.daysOfWeek.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
    : [];

  return {
    timezone: String(value.timezone || "Europe/Istanbul"),
    hour: Number(value.hour ?? 9),
    minute: Number(value.minute ?? 0),
    intervalDays: typeof value.intervalDays === "number" ? value.intervalDays : null,
    daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5],
  };
}

function parseRule(input: unknown) {
  const value = isRecord(input) ? input : {};
  return {
    preventDuplicates: value.preventDuplicates !== false,
    maxRunsPerDay: Number(value.maxRunsPerDay ?? 1),
    maxRunsPerWeek: Number(value.maxRunsPerWeek ?? 7),
    maxSourceAgeDays: Number(value.maxSourceAgeDays ?? 7),
    dedupeLookbackDays: Number(value.dedupeLookbackDays ?? 7),
  };
}

function parseTextLines(input: unknown) {
  if (typeof input !== "string") return [];
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProvider(value: unknown): value is AgentTemplateSeed["suggestedProvider"] {
  return value === "OPENROUTER" || value === "OPENAI" || value === "ANTHROPIC" || value === "MINIMAX" || value === "GLM" || value === "GEMINI" || value === "CUSTOM_OPENAI";
}

function isFindingKind(value: unknown): value is "LEAD" | "OPPORTUNITY" | "NEWS" | "MARKET_SIGNAL" | "SYSTEM" {
  return value === "LEAD" || value === "OPPORTUNITY" || value === "NEWS" || value === "MARKET_SIGNAL" || value === "SYSTEM";
}

function isPackageKey(value: unknown): value is NonNullable<AgentTemplateSeed["visibilityPackageKey"]> {
  return value === "FREE" || value === "BASIC" || value === "PRO" || value === "PREMIUM";
}
