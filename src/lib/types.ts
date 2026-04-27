import type { FindingKind } from "@prisma/client";

export type AgentSchedule = {
  hour: number;
  minute: number;
  everyDays: number;
};

export type AgentDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cadence: string;
  scheduleLabel: string;
  status: "ACTIVE" | "PAUSED";
  schedule?: AgentSchedule;
  prompt: string;
  queries: string[];
};

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

export type GeneratedFinding = {
  kind: FindingKind;
  title: string;
  body: string;
  sourceUrl?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  isDuplicate?: boolean;
  duplicateOf?: string;
  deduplicationScore?: number;
};

export type GeneratedReport = {
  title: string;
  summary: string;
  findings: GeneratedFinding[];
};
