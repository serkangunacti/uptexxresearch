import type { FindingKind, ProviderKind, UserRole } from "@prisma/client";

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
  name: string;
  category: string;
  description: string;
  instruction: string;
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
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  defaultQueries: string[];
  defaultTasks: TemplateTaskSeed[];
  defaultSchedule: TemplateScheduleSeed;
  defaultRule: TemplateRuleSeed;
  suggestedProvider: ProviderKind;
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
  companyName: string;
};
