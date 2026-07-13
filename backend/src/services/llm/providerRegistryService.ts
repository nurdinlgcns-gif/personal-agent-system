import { PrismaClient } from "@prisma/client";
import {
  encryptProviderSecret,
  maskProviderSecret,
} from "./providerCrypto";

const prisma = new PrismaClient();

export type DynamicProviderType =
  | "anthropic"
  | "google"
  | "openai-compatible"
  | "local"
  | "custom-http"
  | "fal";

export type ProviderModelAlias = {
  id: string;
  label: string;
  mode?: "auto" | "fast" | "deep" | "creative";
};

export type CreateLlmProviderPayload = {
  name: string;
  type: DynamicProviderType;
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  enabled?: boolean;
  capabilities?: string[];
  modelAliases?: ProviderModelAlias[];
};

export type UpdateLlmProviderPayload = Partial<CreateLlmProviderPayload>;

function safeJsonParse<TValue>(value: string | null | undefined, fallback: TValue) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? []);
}

function normalizeName(name: string) {
  return name.trim();
}

function normalizeType(type: string): DynamicProviderType {
  const supportedTypes: DynamicProviderType[] = [
    "anthropic",
    "google",
    "openai-compatible",
    "local",
    "custom-http",
    "fal",
  ];

  if (supportedTypes.includes(type as DynamicProviderType)) {
    return type as DynamicProviderType;
  }

  return "custom-http";
}

function toPublicProvider(provider: {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyPreview: string | null;
  defaultModel: string;
  enabled: boolean;
  capabilitiesJson: string;
  modelAliasesJson: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type as DynamicProviderType,
    baseUrl: provider.baseUrl,
    configured: Boolean(provider.apiKeyPreview),
    apiKeyPreview: provider.apiKeyPreview || "",
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    capabilities: safeJsonParse<string[]>(provider.capabilitiesJson, []),
    modelAliases: safeJsonParse<ProviderModelAlias[]>(
      provider.modelAliasesJson,
      []
    ),
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export async function listDynamicLlmProviders() {
  const providers = await prisma.llmProvider.findMany({
    orderBy: [
      {
        enabled: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return providers.map(toPublicProvider);
}

export async function getDynamicLlmProvider(providerId: string) {
  const provider = await prisma.llmProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!provider) {
    return null;
  }

  return toPublicProvider(provider);
}

export async function createDynamicLlmProvider(
  payload: CreateLlmProviderPayload
) {
  const name = normalizeName(payload.name);

  if (!name) {
    throw new Error("Provider name is required.");
  }

  const type = normalizeType(payload.type);

  const apiKey = payload.apiKey?.trim() || "";
  const apiKeyEncrypted = apiKey ? encryptProviderSecret(apiKey) : null;
  const apiKeyPreview = apiKey ? maskProviderSecret(apiKey) : null;

  const provider = await prisma.llmProvider.create({
    data: {
      name,
      type,
      baseUrl: payload.baseUrl?.trim() || null,
      apiKeyEncrypted,
      apiKeyPreview,
      defaultModel: payload.defaultModel?.trim() || "auto",
      enabled: payload.enabled ?? true,
      capabilitiesJson: stringifyJson(payload.capabilities || []),
      modelAliasesJson: stringifyJson(payload.modelAliases || []),
    },
  });

  return toPublicProvider(provider);
}

export async function updateDynamicLlmProvider(
  providerId: string,
  payload: UpdateLlmProviderPayload
) {
  const existingProvider = await prisma.llmProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!existingProvider) {
    throw new Error("Provider not found.");
  }

  const nextData: Record<string, unknown> = {};

  if (typeof payload.name === "string") {
    const name = normalizeName(payload.name);

    if (!name) {
      throw new Error("Provider name cannot be empty.");
    }

    nextData.name = name;
  }

  if (typeof payload.type === "string") {
    nextData.type = normalizeType(payload.type);
  }

  if (typeof payload.baseUrl === "string") {
    nextData.baseUrl = payload.baseUrl.trim() || null;
  }

  if (typeof payload.defaultModel === "string") {
    nextData.defaultModel = payload.defaultModel.trim() || "auto";
  }

  if (typeof payload.enabled === "boolean") {
    nextData.enabled = payload.enabled;
  }

  if (Array.isArray(payload.capabilities)) {
    nextData.capabilitiesJson = stringifyJson(payload.capabilities);
  }

  if (Array.isArray(payload.modelAliases)) {
    nextData.modelAliasesJson = stringifyJson(payload.modelAliases);
  }

  if (typeof payload.apiKey === "string") {
    const apiKey = payload.apiKey.trim();

    if (apiKey) {
      nextData.apiKeyEncrypted = encryptProviderSecret(apiKey);
      nextData.apiKeyPreview = maskProviderSecret(apiKey);
    }
  }

  const updatedProvider = await prisma.llmProvider.update({
    where: {
      id: providerId,
    },
    data: nextData,
  });

  return toPublicProvider(updatedProvider);
}

export async function deleteDynamicLlmProvider(providerId: string) {
  await prisma.llmProvider.delete({
    where: {
      id: providerId,
    },
  });

  return {
    deleted: true,
    id: providerId,
  };
}

export async function testDynamicLlmProvider(providerId: string) {
  const provider = await prisma.llmProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!provider) {
    throw new Error("Provider not found.");
  }

  const publicProvider = toPublicProvider(provider);

  return {
    ok: true,
    provider: publicProvider,
    isMock: true,
    message:
      "Provider registry test passed. Real provider-specific connection test will be implemented in the next integration phase.",
  };
}