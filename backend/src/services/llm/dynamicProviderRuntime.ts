import { PrismaClient } from "@prisma/client";
import {
  getDefaultLlmModel,
  getDefaultLlmProvider,
  isAnthropicConfigured,
  isGoogleConfigured,
} from "../../config/llmProviders";
import type {
  LlmModelMode,
  LlmProvider,
  LlmRequest,
  RuntimeResolvedProvider,
} from "./llmTypes";

const prisma = new PrismaClient();

function safeJsonParse<TValue>(
  value: string | null | undefined,
  fallback: TValue
) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function normalizeProviderType(type: string): LlmProvider {
  if (
    type === "anthropic" ||
    type === "google" ||
    type === "openai-compatible" ||
    type === "local" ||
    type === "custom-http" ||
    type === "fal"
  ) {
    return type;
  }

  return "custom-http";
}

function normalizeMode(mode?: string): LlmModelMode {
  if (
    mode === "auto" ||
    mode === "fast" ||
    mode === "deep" ||
    mode === "creative"
  ) {
    return mode;
  }

  return "auto";
}

function toRuntimeProvider(provider: {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyPreview: string | null;
  defaultModel: string;
  enabled: boolean;
  capabilitiesJson: string;
  modelAliasesJson: string;
}): RuntimeResolvedProvider {
  const modelAliases = safeJsonParse<
    Array<{
      id: string;
      label: string;
      mode?: LlmModelMode;
    }>
  >(provider.modelAliasesJson, []);

  return {
    id: provider.id,
    name: provider.name,
    type: normalizeProviderType(provider.type),
    baseUrl: provider.baseUrl,
    configured: Boolean(provider.apiKeyPreview),
    apiKeyPreview: provider.apiKeyPreview || "",
    defaultModel: provider.defaultModel || "auto",
    enabled: provider.enabled,
    capabilities: safeJsonParse<string[]>(provider.capabilitiesJson, []),
    modelAliases: modelAliases.map((alias) => ({
      ...alias,
      mode: normalizeMode(alias.mode),
    })),
    source: "registry",
  };
}

export async function listEnabledRuntimeProviders() {
  const providers = await prisma.llmProvider.findMany({
    where: {
      enabled: true,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return providers.map(toRuntimeProvider);
}

function matchProviderPreference(
  provider: RuntimeResolvedProvider,
  requestedProvider?: string,
  requestedProviderId?: string
) {
  if (requestedProviderId && provider.id === requestedProviderId) {
    return true;
  }

  if (!requestedProvider || requestedProvider === "auto") {
    return false;
  }

  const normalizedProvider = requestedProvider.toLowerCase();

  return (
    provider.id?.toLowerCase() === normalizedProvider ||
    provider.name.toLowerCase() === normalizedProvider ||
    provider.type.toLowerCase() === normalizedProvider
  );
}

function providerHasModel(provider: RuntimeResolvedProvider, model?: string) {
  if (!model || model === "auto") {
    return false;
  }

  if (provider.defaultModel === model) {
    return true;
  }

  return provider.modelAliases.some((alias) => alias.id === model);
}

function resolveModelFromProvider(
  provider: RuntimeResolvedProvider,
  requestedModel?: string
) {
  if (requestedModel && requestedModel !== "auto") {
    return requestedModel;
  }

  if (provider.defaultModel && provider.defaultModel !== "auto") {
    return provider.defaultModel;
  }

  return provider.modelAliases[0]?.id || "auto";
}

function resolveModeFromProvider(
  provider: RuntimeResolvedProvider,
  model: string,
  requestedMode?: LlmModelMode
): LlmModelMode {
  if (requestedMode && requestedMode !== "auto") {
    return requestedMode;
  }

  const alias = provider.modelAliases.find((item) => item.id === model);

  return normalizeMode(alias?.mode);
}

function buildBuiltInFallback(): RuntimeResolvedProvider {
  const defaultProvider = getDefaultLlmProvider();
  const defaultModel = getDefaultLlmModel();

  if (
    defaultProvider === "google" ||
    (defaultProvider === "auto" &&
      !isAnthropicConfigured() &&
      isGoogleConfigured())
  ) {
    return {
      id: null,
      name: "Google Built-in Fallback",
      type: "google",
      baseUrl: "https://generativelanguage.googleapis.com",
      configured: isGoogleConfigured(),
      apiKeyPreview: "",
      defaultModel: defaultModel !== "auto" ? defaultModel : "gemini-default",
      enabled: true,
      capabilities: ["chat", "multimodal", "fallback"],
      modelAliases: [
        {
          id: "gemini-default",
          label: "Gemini Default",
          mode: "auto",
        },
      ],
      source: "built-in-fallback",
    };
  }

  return {
    id: null,
    name: "Claude Built-in Fallback",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    configured: isAnthropicConfigured(),
    apiKeyPreview: "",
    defaultModel: defaultModel !== "auto" ? defaultModel : "claude-default",
    enabled: true,
    capabilities: ["chat", "reasoning", "fallback"],
    modelAliases: [
      {
        id: "claude-default",
        label: "Claude Default",
        mode: "auto",
      },
    ],
    source: "built-in-fallback",
  };
}

export async function resolveRuntimeProvider(
  request: LlmRequest
): Promise<{
  provider: RuntimeResolvedProvider;
  model: string;
  mode: LlmModelMode;
}> {
  const enabledProviders = await listEnabledRuntimeProviders();

  const requestedProvider = request.preference?.provider;
  const requestedProviderId = request.preference?.providerId;
  const requestedModel = request.preference?.model;
  const requestedMode = request.preference?.mode;

  const providerByPreference = enabledProviders.find((provider) =>
    matchProviderPreference(provider, requestedProvider, requestedProviderId)
  );

  if (providerByPreference) {
    const model = resolveModelFromProvider(providerByPreference, requestedModel);
    const mode = resolveModeFromProvider(
      providerByPreference,
      model,
      requestedMode
    );

    return {
      provider: providerByPreference,
      model,
      mode,
    };
  }

  const providerByModel = enabledProviders.find((provider) =>
    providerHasModel(provider, requestedModel)
  );

  if (providerByModel) {
    const model = resolveModelFromProvider(providerByModel, requestedModel);
    const mode = resolveModeFromProvider(providerByModel, model, requestedMode);

    return {
      provider: providerByModel,
      model,
      mode,
    };
  }

  const firstEnabledProvider = enabledProviders[0];

  if (firstEnabledProvider) {
    const model = resolveModelFromProvider(firstEnabledProvider, requestedModel);
    const mode = resolveModeFromProvider(
      firstEnabledProvider,
      model,
      requestedMode
    );

    return {
      provider: firstEnabledProvider,
      model,
      mode,
    };
  }

  const fallbackProvider = buildBuiltInFallback();
  const fallbackModel =
    requestedModel && requestedModel !== "auto"
      ? requestedModel
      : fallbackProvider.defaultModel;

  return {
    provider: fallbackProvider,
    model: fallbackModel,
    mode: requestedMode || "auto",
  };
}