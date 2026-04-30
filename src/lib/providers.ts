import type { ProviderKind } from "@prisma/client";
import type { ApiCredential } from "@prisma/client";
import type { ProviderCatalogEntry, ProviderModelOption } from "./types";

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    provider: "OPENROUTER",
    label: "OpenRouter",
    planTypes: ["OpenRouter Free", "OpenRouter Paid"],
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", billing: "paid" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", billing: "paid" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", billing: "paid" },
      { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 Free", billing: "free" },
      { id: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B Free", billing: "free" },
    ],
  },
  {
    provider: "OPENAI",
    label: "OpenAI",
    planTypes: ["GPT API"],
    defaultBaseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1", billing: "paid" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", billing: "paid" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", billing: "paid" },
    ],
  },
  {
    provider: "ANTHROPIC",
    label: "Anthropic",
    planTypes: ["Claude API"],
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", billing: "paid" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", billing: "paid" },
    ],
  },
  {
    provider: "MINIMAX",
    label: "MiniMax",
    planTypes: ["MiniMax Token Plan"],
    defaultBaseUrl: "https://api.minimax.io/v1",
    models: [
      { id: "MiniMax-M2.7", label: "MiniMax M2.7", billing: "paid" },
      { id: "MiniMax-Text-01", label: "MiniMax Text 01", billing: "paid" },
    ],
  },
  {
    provider: "GLM",
    label: "GLM",
    planTypes: ["GLM API"],
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { id: "glm-4.5", label: "GLM 4.5", billing: "paid" },
      { id: "glm-4-air", label: "GLM 4 Air", billing: "paid" },
    ],
  },
  {
    provider: "GEMINI",
    label: "Gemini",
    planTypes: ["Gemini API"],
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", billing: "paid" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", billing: "paid" },
    ],
  },
  {
    provider: "CUSTOM_OPENAI",
    label: "Custom OpenAI-Compatible",
    planTypes: ["Custom Provider"],
    supportsCustomBaseUrl: true,
    models: [],
  },
];

export function getProviderCatalog() {
  return PROVIDER_CATALOG;
}

export function getProviderEntry(provider: ProviderKind) {
  return PROVIDER_CATALOG.find((entry) => entry.provider === provider);
}

export function getModelOptionsForCredential(credential: Pick<ApiCredential, "provider" | "modelOverrides">): ProviderModelOption[] {
  const entry = getProviderEntry(credential.provider);
  if (!entry) return [];
  const overrides = Array.isArray(credential.modelOverrides) ? credential.modelOverrides : [];
  const overrideOptions = overrides
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .map((value) => ({ id: value, label: value, billing: "paid" as const }));
  return entry.models.length > 0 ? [...entry.models, ...overrideOptions] : overrideOptions;
}

export function isModelAllowed(credential: Pick<ApiCredential, "provider" | "modelOverrides">, modelName: string) {
  return getModelOptionsForCredential(credential).some((model) => model.id === modelName);
}

export function getCredentialBaseUrl(credential: Pick<ApiCredential, "provider" | "baseUrl">) {
  return credential.baseUrl || getProviderEntry(credential.provider)?.defaultBaseUrl || "";
}
