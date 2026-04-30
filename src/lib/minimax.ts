import OpenAI from "openai";
import { z } from "zod";
import { FindingKind, type ProviderKind } from "@prisma/client";
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
  findings: z.array(findingSchema).min(1)
});

type AgentContext = {
  id: string;
  name: string;
  defaultPrompt: string;
  modelProvider: ProviderKind | null;
  modelName: string | null;
};

type TaskContext = {
  name: string;
  instruction: string;
};

type CredentialContext = {
  provider: ProviderKind;
  decryptedKey: string;
  resolvedBaseUrl: string;
};

export async function generateReportWithProvider(
  agent: AgentContext,
  tasks: TaskContext[],
  sources: SearchResult[],
  credential: CredentialContext
): Promise<GeneratedReport> {
  if (!agent.modelName) {
    throw new Error("Ajan için model seçimi yapılmamış.");
  }

  const sourceBlock = sources
    .map((source, index) => {
      return [
        `#${index + 1}`,
        `Title: ${source.title}`,
        `URL: ${source.url}`,
        source.publishedAt ? `PublishedAt: ${source.publishedAt}` : "",
        `Snippet: ${source.snippet || "No snippet"}`
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const taskBlock = tasks.length
    ? tasks.map((task, index) => `${index + 1}. ${task.name}: ${task.instruction}`).join("\n")
    : "1. Toplanan kaynaklardan son 7 güne ait en önemli bulguları çıkar.";

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a disciplined multi-tenant research analyst. Return only valid JSON. Do not include markdown fences."
    },
    {
      role: "user" as const,
      content: [
        `Agent: ${agent.name}`,
        `Mission: ${agent.defaultPrompt}`,
        `Date: ${new Date().toISOString()}`,
        "",
        "Tasks:",
        taskBlock,
        "",
        "Rules:",
        "- Write Turkish output.",
        "- Use only sources from the last 7 days.",
        "- Do not repeat old findings or duplicate URLs.",
        "- Every finding must include sourceUrl when available.",
        "- Do not invent facts, prices, people, phone numbers, or links.",
        "",
        "Return JSON with this shape:",
        "{\"title\":\"...\",\"summary\":\"...\",\"findings\":[{\"kind\":\"LEAD|OPPORTUNITY|NEWS|MARKET_SIGNAL|SYSTEM\",\"title\":\"...\",\"body\":\"...\",\"sourceUrl\":\"https://...\",\"score\":0}]}",
        "",
        "Sources:",
        sourceBlock || "No live sources returned."
      ].join("\n")
    }
  ];

  const raw = await completeWithProvider(credential, agent.modelName, messages);
  const parsed = safeParseJson(raw);
  const validated = reportSchema.safeParse(parsed);

  if (!validated.success) {
    throw new Error("Model JSON çıktısı doğrulanamadı.");
  }

  return validated.data;
}

async function completeWithProvider(
  credential: CredentialContext,
  modelName: string,
  messages: { role: "system" | "user"; content: string }[]
) {
  switch (credential.provider) {
    case "ANTHROPIC":
      return completeWithAnthropic(credential.decryptedKey, modelName, messages);
    case "GEMINI":
      return completeWithGemini(credential.decryptedKey, modelName, messages);
    default:
      return completeWithOpenAICompatible(credential.decryptedKey, credential.resolvedBaseUrl, modelName, messages);
  }
}

async function completeWithOpenAICompatible(
  apiKey: string,
  baseURL: string,
  modelName: string,
  messages: { role: "system" | "user"; content: string }[]
) {
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model: modelName,
    temperature: 0.2,
    messages,
  });
  return response.choices[0]?.message?.content ?? "";
}

async function completeWithAnthropic(
  apiKey: string,
  modelName: string,
  messages: { role: "system" | "user"; content: string }[]
) {
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? "";
  const userPrompt = messages.filter((message) => message.role === "user").map((message) => message.content).join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 2000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API hatası: ${response.status}`);
  }

  const payload = await response.json();
  return payload.content?.[0]?.text ?? "";
}

async function completeWithGemini(
  apiKey: string,
  modelName: string,
  messages: { role: "system" | "user"; content: string }[]
) {
  const mergedPrompt = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [{ text: mergedPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API hatası: ${response.status}`);
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function safeParseJson(content: string) {
  const withoutThink = content.replace(/<think>[\s\S]*?<\/think>/g, "");
  const trimmed = withoutThink.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

export function fallbackSystemReport(note: string): GeneratedReport {
  return {
    title: "Araştırma engellendi",
    summary: note,
    findings: [
      {
        kind: FindingKind.SYSTEM,
        title: "Araştırma başlatılamadı",
        body: note,
        score: 0,
      },
    ],
  };
}
