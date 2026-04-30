import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(""),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  APP_ENCRYPTION_KEY: z.string().optional().default(""),
  TAVILY_API_KEY: z.string().optional().default(""),
  SLACK_BOT_TOKEN: z.string().optional().default(""),
  SLACK_CHANNEL_ID: z.string().optional().default(""),
  SLACK_DRY_RUN: z.string().optional().default("true"),
  TZ: z.string().optional().default("Europe/Istanbul"),
  GITHUB_PAT: z.string().optional().default(""),
  GITHUB_REPO: z.string().optional().default(""),
  GITHUB_WORKFLOW_REF: z.string().optional().default("main"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_PUBLIC_URL:
    process.env.APP_PUBLIC_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
  SLACK_DRY_RUN: process.env.SLACK_DRY_RUN,
  TZ: process.env.TZ,
  GITHUB_PAT: process.env.GITHUB_PAT,
  GITHUB_REPO: process.env.GITHUB_REPO,
  GITHUB_WORKFLOW_REF: process.env.GITHUB_WORKFLOW_REF,
});

export function searchIsConfigured() {
  return Boolean(env.TAVILY_API_KEY);
}

export function slackIsConfigured() {
  return Boolean(env.SLACK_BOT_TOKEN && env.SLACK_CHANNEL_ID && env.SLACK_DRY_RUN !== "true");
}
