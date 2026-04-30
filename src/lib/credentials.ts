import { prisma } from "./db";
import { decryptSecret, encryptSecret, maskApiKey } from "./security";
import { getCredentialBaseUrl, getModelOptionsForCredential, isModelAllowed } from "./providers";

export async function listCredentialsForCompany(companyId: string) {
  return prisma.apiCredential.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCredential(input: {
  companyId: string;
  createdByUserId: string;
  provider: "OPENROUTER" | "OPENAI" | "ANTHROPIC" | "MINIMAX" | "GLM" | "GEMINI" | "CUSTOM_OPENAI";
  planType: string;
  label: string;
  apiKey: string;
  baseUrl?: string | null;
  modelOverrides?: string[];
}) {
  const encrypted = encryptSecret(input.apiKey.trim());
  return prisma.apiCredential.create({
    data: {
      companyId: input.companyId,
      createdByUserId: input.createdByUserId,
      provider: input.provider,
      planType: input.planType,
      label: input.label,
      maskedKeyPreview: maskApiKey(input.apiKey.trim()),
      baseUrl: input.baseUrl?.trim() || null,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      modelOverrides: input.modelOverrides?.filter(Boolean) ?? [],
      isActive: true,
    },
  });
}

export async function resolveCredentialForAgent(input: {
  companyId: string;
  credentialId: string | null;
  modelName: string | null;
}) {
  if (!input.credentialId || !input.modelName) {
    throw new Error("Bu ajan için aktif bir API key ve model seçimi zorunlu.");
  }

  const credential = await prisma.apiCredential.findFirst({
    where: {
      id: input.credentialId,
      companyId: input.companyId,
      isActive: true,
    },
  });

  if (!credential) {
    throw new Error("Seçili API key bulunamadı veya pasif durumda.");
  }

  if (!isModelAllowed(credential, input.modelName)) {
    throw new Error("Seçili model, bu API key planı için uygun değil.");
  }

  return {
    ...credential,
    decryptedKey: decryptSecret(credential),
    resolvedBaseUrl: getCredentialBaseUrl(credential),
    availableModels: getModelOptionsForCredential(credential),
  };
}
