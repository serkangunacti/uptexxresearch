import type {
  FindingKind,
  PackageKey,
  ProviderKind,
  TemplateLifecycle,
  TemplateOrigin,
  UserRole,
} from "@prisma/client";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string | null;
};

export type GeneratedFinding = {
  kind: FindingKind;
  title: string;
  body: string;
  sourceUrl?: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type GeneratedReport = {
  title: string;
  summary: string;
  findings: GeneratedFinding[];
};

export type TemplateTaskSeed = {
  key?: string;
  name: string;
  category: string;
  description: string;
  instruction: string;
  defaultSelected?: boolean;
};

export type CatalogSourceSeed = {
  key: string;
  label: string;
  description: string;
  queryHint?: string;
  defaultSelected?: boolean;
};

export type TemplateConfigFieldSeed = {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: string;
};

export type TemplateOutputSchemaSeed = {
  findingKind?: FindingKind;
  requiredMetadataFields?: string[];
  metadataLabels?: Record<string, string>;
};

export type TemplateScheduleSeed = {
  hour: number;
  minute: number;
  timezone: string;
  intervalDays?: number | null;
  daysOfWeek?: number[] | null;
};

export type TemplateRuleSeed = {
  maxRunsPerDay: number;
  maxRunsPerWeek: number;
  maxSourceAgeDays: number;
  dedupeLookbackDays: number;
  preventDuplicates: boolean;
};

export type AgentTemplateSeed = {
  id: string;
  companyId?: string | null;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  defaultQueries: string[];
  defaultTasks: TemplateTaskSeed[];
  defaultSchedule: TemplateScheduleSeed;
  defaultRule: TemplateRuleSeed;
  suggestedProvider: ProviderKind;
  origin?: TemplateOrigin;
  lifecycle?: TemplateLifecycle;
  isSelectable?: boolean;
  configSchema?: TemplateConfigFieldSeed[];
  sourceCatalog?: CatalogSourceSeed[];
  taskBlueprints?: TemplateTaskSeed[];
  outputSchema?: TemplateOutputSchemaSeed;
  visibilityPackageKey?: PackageKey | null;
};

export type DefaultAgentSeed = {
  templateId: string;
  slug: string;
  name: string;
  description: string;
  defaultPrompt?: string;
  defaultQueries?: string[];
  modelProvider?: ProviderKind;
  modelName?: string;
};

export type ProviderModelOption = {
  id: string;
  label: string;
  billing: "free" | "paid";
};

export type ProviderCatalogEntry = {
  provider: ProviderKind;
  label: string;
  planTypes: string[];
  defaultBaseUrl?: string;
  supportsCustomBaseUrl?: boolean;
  models: ProviderModelOption[];
};

export type SessionUser = {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  companyName: string;
};

export type PlanPackageSeed = {
  key: PackageKey;
  name: string;
  monthlyPrice: number;
  currency: string;
  activeAgentLimit: number;
  allowsCustomAgentBuilder: boolean;
  sortOrder: number;
  isActive?: boolean;
};
