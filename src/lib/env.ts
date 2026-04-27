import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  MINIMAX_API_KEY: z.string().optional().default(""),
  MINIMAX_BASE_URL: z.string().url().default("https://api.minimax.io/v1"),
  MINIMAX_MODEL: z.string().min(1).default("MiniMax-M2.7"),
  SEARXNG_URL: z.string().optional().default(""),
  SLACK_BOT_TOKEN: z.string().optional().default(""),
  SLACK_CHANNEL_ID: z.string().optional().default(""),
  SLACK_DRY_RUN: z.string().optional().default("true"),
  TZ: z.string().optional().default("Europe/Istanbul"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  MINIMAX_BASE_URL: process.env.MINIMAX_BASE_URL,
  MINIMAX_MODEL: process.env.MINIMAX_MODEL,
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
