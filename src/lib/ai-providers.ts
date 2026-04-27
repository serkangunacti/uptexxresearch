import OpenAI from "openai";
import { env, getAIModelChain } from "./env";
import { prisma } from "./db";
import type { AgentDefinition, GeneratedReport, SearchResult } from "./types";

export interface AIProvider {
  generateReport(
    agent: AgentDefinition,
    sources: SearchResult[],
    runId?: string
  ): Promise<GeneratedReport>;
}

export class OpenRouterProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': env.APP_PUBLIC_URL,
        'X-Title': 'Uptexx Research Automation'
      }
    });
  }

  async generateReport(
    agent: AgentDefinition,
    sources: SearchResult[],
    runId?: string
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      // Format sources for prompt
      const sourcesText = sources
        .map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${source.content}\n`)
        .join("\n");

      // Get model from agent config or use default
      const modelConfig = await this.getModelConfig(agent.id);
      const model = modelConfig?.model || "openrouter/claude-3.5-sonnet";

      const systemPrompt = `Sen bir araştırma asistanısın. Aşağıdaki kaynaklardan ${agent.name} için rapor hazırla.

Talimatlar:
- Kaynakları analiz et ve önemli bulguları çıkar
- Bulguları şu kategorilerden birine ayır: LEAD, OPPORTUNITY, NEWS, MARKET_SIGNAL, SYSTEM
- Her bulgu için başlık, açıklama ve kaynak URL'si belirt
- Sadece Türkçe yanıt ver
- JSON formatında yanıt ver

JSON formatı:
{
  "title": "Rapor başlığı",
  "summary": "Rapor özeti",
  "findings": [
    {
      "kind": "LEAD|OPPORTUNITY|NEWS|MARKET_SIGNAL|SYSTEM",
      "title": "Bulgu başlığı",
      "body": "Bulgu açıklaması",
      "sourceUrl": "https://example.com"
    }
  ]
}`;

      const userPrompt = `${agent.prompt}\n\nKaynaklar:\n${sourcesText}`;

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: modelConfig?.temperature || 0.2,
        max_tokens: modelConfig?.maxTokens || 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenRouter");
      }

      // Clean response (remove thinking tags if present)
      const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(cleanedContent);

      // Log usage
      if (runId) {
        await this.logUsage(agent.id, runId, model, response.usage, startTime);
      }

      return parsed;

    } catch (error) {
      console.error("OpenRouter generation error:", error);

      // Log failed usage
      if (runId) {
        await this.logUsage(agent.id, runId, "unknown", null, startTime, error.message);
      }

      throw error;
    }
  }

  private async getModelConfig(agentId: string) {
    return prisma.aIModelConfig.findFirst({
      where: { agentId, isActive: true },
      orderBy: { priority: 'asc' }
    });
  }

  private async logUsage(
    agentId: string,
    runId: string,
    model: string,
    usage: any,
    startTime: number,
    error?: string
  ) {
    const latency = Date.now() - startTime;

    await prisma.aIUsageLog.create({
      data: {
        agentId,
        runId,
        provider: "OPENROUTER",
        model: model as any,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        costUSD: 0, // TODO: Calculate based on model pricing
        latencyMs: latency,
        success: !error,
        errorMessage: error
      }
    });
  }
}

export class MiniMaxProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.MINIMAX_API_KEY,
      baseURL: env.MINIMAX_BASE_URL,
    });
  }

  async generateReport(
    agent: AgentDefinition,
    sources: SearchResult[],
    runId?: string
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      // Format sources for prompt
      const sourcesText = sources
        .map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${source.content}\n`)
        .join("\n");

      const systemPrompt = `Sen bir araştırma asistanısın. Aşağıdaki kaynaklardan ${agent.name} için rapor hazırla.

Talimatlar:
- Kaynakları analiz et ve önemli bulguları çıkar
- Bulguları şu kategorilerden birine ayır: LEAD, OPPORTUNITY, NEWS, MARKET_SIGNAL, SYSTEM
- Her bulgu için başlık, açıklama ve kaynak URL'si belirt
- Sadece Türkçe yanıt ver
- JSON formatında yanıt ver

JSON formatı:
{
  "title": "Rapor başlığı",
  "summary": "Rapor özeti",
  "findings": [
    {
      "kind": "LEAD|OPPORTUNITY|NEWS|MARKET_SIGNAL|SYSTEM",
      "title": "Bulgu başlığı",
      "body": "Bulgu açıklaması",
      "sourceUrl": "https://example.com"
    }
  ]
}`;

      const userPrompt = `${agent.prompt}\n\nKaynaklar:\n${sourcesText}`;

      const response = await this.client.chat.completions.create({
        model: env.MINIMAX_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from MiniMax");
      }

      // Clean response (remove thinking tags if present)
      const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Parse JSON response
      const parsed = JSON.parse(cleanedContent);

      // Log usage
      if (runId) {
        await this.logUsage(agent.id, runId, response.usage, startTime);
      }

      return parsed;

    } catch (error) {
      console.error("MiniMax generation error:", error);

      // Log failed usage
      if (runId) {
        await this.logUsage(agent.id, runId, null, startTime, error.message);
      }

      throw error;
    }
  }

  private async logUsage(
    agentId: string,
    runId: string,
    usage: any,
    startTime: number,
    error?: string
  ) {
    const latency = Date.now() - startTime;

    await prisma.aIUsageLog.create({
      data: {
        agentId,
        runId,
        provider: "MINIMAX",
        model: "MINIMAX_M2_7",
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        costUSD: 0, // TODO: Calculate based on MiniMax pricing
        latencyMs: latency,
        success: !error,
        errorMessage: error
      }
    });
  }
}

export async function getAIProvider(agentId?: string): Promise<AIProvider> {
  // Check if agent has custom model config
  if (agentId) {
    const config = await prisma.aIModelConfig.findFirst({
      where: { agentId, isActive: true },
      orderBy: { priority: 'asc' }
    });

    if (config) {
      switch (config.provider) {
        case "OPENROUTER":
          return new OpenRouterProvider();
        case "MINIMAX":
          return new MiniMaxProvider();
        // Add other providers here
      }
    }
  }

  // Fall back to model chain
  const chain = getAIModelChain();
  for (const { provider } of chain) {
    switch (provider) {
      case "OPENROUTER":
        if (env.OPENROUTER_API_KEY) {
          return new OpenRouterProvider();
        }
        break;
      case "MINIMAX":
        if (env.MINIMAX_API_KEY) {
          return new MiniMaxProvider();
        }
        break;
    }
  }

  // Final fallback
  if (env.MINIMAX_API_KEY) {
    return new MiniMaxProvider();
  }

  throw new Error("No AI provider configured");
}