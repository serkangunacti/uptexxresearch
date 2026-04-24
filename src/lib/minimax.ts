import OpenAI from "openai";
import { z } from "zod";
import { FindingKind } from "@prisma/client";
import { env, minimaxIsConfigured } from "./env";
import type { AgentDefinition } from "./types";
import type { GeneratedReport, SearchResult } from "./types";

const findingSchema = z.object({
  kind: z.enum(["LEAD", "OPPORTUNITY", "NEWS", "MARKET_SIGNAL", "SYSTEM"]).default("NEWS"),
  title: z.string().min(1),
  body: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  score: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional()
});

const reportSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  findings: z.array(findingSchema).min(1).max(20)
});

export async function generateReportWithMiniMax(
  agent: AgentDefinition,
  sources: SearchResult[]
): Promise<GeneratedReport> {
  if (!minimaxIsConfigured()) {
    return fallbackReport(agent, sources, "MiniMax API key is not configured; generated from collected source snippets.");
  }

  const client = new OpenAI({
    apiKey: env.MINIMAX_API_KEY,
    baseURL: env.MINIMAX_BASE_URL
  });

  const sourceBlock = sources
    .map((source, index) => {
      return [
        `#${index + 1}`,
        `Title: ${source.title}`,
        `URL: ${source.url}`,
        `Snippet: ${source.snippet || "No snippet"}`
      ].join("\n");
    })
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: env.MINIMAX_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a disciplined research analyst for Uptexx, an IT consulting and software licensing company. Return only valid JSON. Do not include markdown fences."
      },
      {
        role: "user",
        content: [
          `Agent: ${agent.name}`,
          `Mission: ${agent.prompt}`,
          `Date: ${new Date().toISOString()}`,
          "",
          "Rules:",
          "- Write Turkish output.",
          "- Every finding must have a clickable sourceUrl when a source is available.",
          "- Do not invent phone numbers, emails, prices, or company details.",
          "- For EU jobs, exclude hourly rates below 40 USD.",
          "- For crypto, do not give financial advice; report signals and risks only.",
          "",
          "Return JSON with this shape:",
          "{\"title\":\"...\",\"summary\":\"...\",\"findings\":[{\"kind\":\"LEAD|OPPORTUNITY|NEWS|MARKET_SIGNAL|SYSTEM\",\"title\":\"...\",\"body\":\"...\",\"sourceUrl\":\"https://...\",\"score\":0}]}",
          "",
          "Sources:",
          sourceBlock || "No live sources returned."
        ].join("\n")
      }
    ]
  });

  const content = response.choices[0]?.message?.content ?? "";
  const parsed = safeParseJson(content);
  const validated = reportSchema.safeParse(parsed);

  if (!validated.success) {
    return fallbackReport(agent, sources, "MiniMax response could not be parsed as the expected JSON report shape.");
  }

  return validated.data;
}

function safeParseJson(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function fallbackReport(agent: AgentDefinition, sources: SearchResult[], note: string): GeneratedReport {
  const findings: GeneratedReport["findings"] = sources.slice(0, 8).map((source, index) => ({
    kind: inferFindingKind(agent.id),
    title: source.title,
    body: source.snippet || `${source.title} kaynağı inceleme için bulundu.`,
    sourceUrl: source.url,
    score: Math.max(40, 90 - index * 5),
    metadata: { source: source.source }
  }));

  if (findings.length === 0) {
    findings.push({
      kind: FindingKind.SYSTEM,
      title: "Kaynak bulunamadı",
      body: "Bu çalışma için arama sonucu döndürülemedi. Sorgular veya kaynak listesi genişletilmeli.",
      score: 10,
      metadata: { note }
    });
  }

  return {
    title: `${agent.name} Raporu`,
    summary: note,
    findings
  };
}

function inferFindingKind(agentId: string) {
  if (agentId.includes("crypto")) return FindingKind.MARKET_SIGNAL;
  if (agentId.includes("tr") || agentId.includes("eu")) return FindingKind.LEAD;
  return FindingKind.NEWS;
}
