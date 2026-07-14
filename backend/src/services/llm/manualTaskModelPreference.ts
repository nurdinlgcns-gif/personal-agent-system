import type {
    LlmModelMode,
    LlmProvider,
    LlmRuntimePreference,
  } from "./llmTypes";
  
  function normalizeMode(value: unknown): LlmModelMode {
    if (
      value === "auto" ||
      value === "fast" ||
      value === "deep" ||
      value === "creative"
    ) {
      return value;
    }
  
    return "auto";
  }
  
  function normalizeProvider(value: unknown): LlmProvider | string {
    if (typeof value !== "string") {
      return "auto";
    }
  
    return value;
  }
  
  export function extractManualTaskModelPreference(
    body: unknown
  ): LlmRuntimePreference {
    const requestBody = body as {
      modelPreference?: {
        providerId?: unknown;
        provider?: unknown;
        model?: unknown;
        mode?: unknown;
      };
      providerId?: unknown;
      provider?: unknown;
      model?: unknown;
      mode?: unknown;
    };
  
    const preference = requestBody?.modelPreference || requestBody || {};
  
    return {
      providerId:
        typeof preference.providerId === "string"
          ? preference.providerId
          : undefined,
      provider: normalizeProvider(preference.provider),
      model: typeof preference.model === "string" ? preference.model : "auto",
      mode: normalizeMode(preference.mode),
    };
  }