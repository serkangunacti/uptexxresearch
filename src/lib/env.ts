import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:3000"),

  // AI Providers
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  MINIMAX_API_KEY: z.string().optional().default(""),
  MINIMAX_BASE_URL: z.string().url().default("https://api.minimax.io/v1"),
  MINIMAX_MODEL: z.string().min(1).default("MiniMax-M2.7"),
  AI_MODEL_CHAIN: z.string().optional().default("OPENROUTER:openrouter/claude-3.5-sonnet,MINIMAX:MiniMax-M2.7"),

  // Deduplication
  DEDUP_ENABLED: z.string().optional().default("true"),
  DEDUP_STRATEGY: z.string().optional().default("url,hash"),
  DEDUP_SEMANTIC_THRESHOLD: z.string().optional().default("0.85"),
  DEDUP_LOOKBACK_DAYS: z.string().optional().default("30"),

  // Report Retention
  DEFAULT_REPORT_RETENTION_DAYS: z.string().optional().default("7"),
  AUTO_ARCHIVE_REPORTS: z.string().optional().default("true"),
  AUTO_DELETE_ARCHIVED_AFTER_DAYS: z.string().optional().default("90"),

  // Football Data
  FOOTBALL_DATA_API_KEY: z.string().optional().default(""),
  FOOTBALL_DATA_BASE_URL: z.string().url().default("https://api.football-data.org/v4"),
  FOOTBALL_SYNC_INTERVAL_HOURS: z.string().optional().default("6"),
  FOOTBALL_LEAGUES: z.string().optional().default("PL,LA,SA,BL1,FL1,CL,EL,TR1"),

  // Legacy/Other
  SEARXNG_URL: z.string().optional().default(""),
  SLACK_BOT_TOKEN: z.string().optional().default(""),
  SLACK_CHANNEL_ID: z.string().optional().default(""),
  SLACK_DRY_RUN: z.string().optional().default("true"),
  TZ: z.string().optional().default("Europe/Istanbul"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),

  // AI Providers
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  MINIMAX_BASE_URL: process.env.MINIMAX_BASE_URL,
  MINIMAX_MODEL: process.env.MINIMAX_MODEL,
  AI_MODEL_CHAIN: process.env.AI_MODEL_CHAIN,

  // Deduplication
  DEDUP_ENABLED: process.env.DEDUP_ENABLED,
  DEDUP_STRATEGY: process.env.DEDUP_STRATEGY,
  DEDUP_SEMANTIC_THRESHOLD: process.env.DEDUP_SEMANTIC_THRESHOLD,
  DEDUP_LOOKBACK_DAYS: process.env.DEDUP_LOOKBACK_DAYS,

  // Report Retention
  DEFAULT_REPORT_RETENTION_DAYS: process.env.DEFAULT_REPORT_RETENTION_DAYS,
  AUTO_ARCHIVE_REPORTS: process.env.AUTO_ARCHIVE_REPORTS,
  AUTO_DELETE_ARCHIVED_AFTER_DAYS: process.env.AUTO_DELETE_ARCHIVED_AFTER_DAYS,

  // Football Data
  FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
  FOOTBALL_DATA_BASE_URL: process.env.FOOTBALL_DATA_BASE_URL,
  FOOTBALL_SYNC_INTERVAL_HOURS: process.env.FOOTBALL_SYNC_INTERVAL_HOURS,
  FOOTBALL_LEAGUES: process.env.FOOTBALL_LEAGUES,

  // Legacy/Other
  SEARXNG_URL: process.env.SEARXNG_URL,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
  SLACK_DRY_RUN: process.env.SLACK_DRY_RUN,
  TZ: process.env.TZ,
});

export function slackIsConfigured() {
  return Boolean(env.SLACK_BOT_TOKEN && env.SLACK_CHANNEL_ID && env.SLACK_DRY_RUN !== "true");
}

export function minimaxIsConfigured() {
  return Boolean(env.MINIMAX_API_KEY);
}

export function openrouterIsConfigured() {
  return Boolean(env.OPENROUTER_API_KEY);
}

export function aiIsConfigured() {
  return openrouterIsConfigured() || minimaxIsConfigured();
}

export function deduplicationEnabled() {
  return env.DEDUP_ENABLED === "true";
}

export function getDeduplicationStrategies(): string[] {
  return env.DEDUP_STRATEGY.split(",").map(s => s.trim());
}

export function getAIModelChain(): Array<{ provider: string; model: string }> {
  return env.AI_MODEL_CHAIN.split(",").map(item => {
    const [provider, model] = item.trim().split(":");
    return { provider, model };
  });
}

export function getReportRetentionDays(): number {
  return parseInt(env.DEFAULT_REPORT_RETENTION_DAYS);
}

export function autoArchiveEnabled(): boolean {
  return env.AUTO_ARCHIVE_REPORTS === "true";
}

export function footballDataConfigured(): boolean {
  return Boolean(env.FOOTBALL_DATA_API_KEY);
}
