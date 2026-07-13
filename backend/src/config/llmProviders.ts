import type {
    LlmModelMode,
    LlmProvider,
    LlmProviderStatus,
  } from "../services/llm/llmTypes";
  
  type LlmModelDefinition = {
    id: string;
    label: string;
    mode: LlmModelMode;
    provider: Exclude<LlmProvider, "auto">;
  };
  
  const anthropicModels: LlmModelDefinition[] = [
    {
      id: "claude-default",
      label: "Claude Default",
      mode: "auto",
      provider: "anthropic",
    },
    {
      id: "claude-fast",
      label: "Claude Fast",
      mode: "fast",
      provider: "anthropic",
    },
    {
      id: "claude-deep",
      label: "Claude Deep",
      mode: "deep",
      provider: "anthropic",
    },
    {
      id: "claude-creative",
      label: "Claude Creative",
      mode: "creative",
      provider: "anthropic",
    },
  ];
  
  const googleModels: LlmModelDefinition[] = [
    {
      id: "gemini-default",
      label: "Gemini Default",
      mode: "auto",
      provider: "google",
    },
    {
      id: "gemini-fast",
      label: "Gemini Fast",
      mode: "fast",
      provider: "google",
    },
    {
      id: "gemini-deep",
      label: "Gemini Deep",
      mode: "deep",
      provider: "google",
    },
    {
      id: "gemini-creative",
      label: "Gemini Creative",
      mode: "creative",
      provider: "google",
    },
  ];
  
  export function getAnthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY || "";
  }
  
  export function getGoogleAiApiKey() {
    return process.env.GOOGLE_AI_API_KEY || "";
  }
  
  export function getDefaultLlmProvider(): LlmProvider {
    const provider = process.env.LLM_DEFAULT_PROVIDER;
  
    if (provider === "anthropic" || provider === "google" || provider === "auto") {
      return provider;
    }
  
    return "auto";
  }
  
  export function getDefaultLlmModel() {
    return process.env.LLM_DEFAULT_MODEL || "auto";
  }
  
  export function isAnthropicConfigured() {
    return getAnthropicApiKey().trim().length > 0;
  }
  
  export function isGoogleConfigured() {
    return getGoogleAiApiKey().trim().length > 0;
  }
  
  export function getLlmModelCatalog() {
    return {
      anthropic: anthropicModels,
      google: googleModels,
      all: [...anthropicModels, ...googleModels],
    };
  }
  
  export function getLlmProviderStatuses(): LlmProviderStatus[] {
    return [
      {
        provider: "anthropic",
        displayName: "Anthropic Claude",
        configured: isAnthropicConfigured(),
        defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || "claude-default",
        availableModels: anthropicModels,
      },
      {
        provider: "google",
        displayName: "Google AI Studio / Gemini",
        configured: isGoogleConfigured(),
        defaultModel: process.env.GOOGLE_DEFAULT_MODEL || "gemini-default",
        availableModels: googleModels,
      },
    ];
  }
  
  export function resolveProviderByModel(model?: string): LlmProvider {
    if (!model || model === "auto") {
      return getDefaultLlmProvider();
    }
  
    if (anthropicModels.some((item) => item.id === model)) {
      return "anthropic";
    }
  
    if (googleModels.some((item) => item.id === model)) {
      return "google";
    }
  
    return getDefaultLlmProvider();
  }
  
  export function resolveModelMode(model?: string): LlmModelMode {
    if (!model || model === "auto") {
      return "auto";
    }
  
    const foundModel = getLlmModelCatalog().all.find((item) => item.id === model);
  
    return foundModel?.mode || "auto";
  }
  
  export function maskSecret(secret: string) {
    if (!secret) {
      return "";
    }
  
    if (secret.length <= 8) {
      return "********";
    }
  
    return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
  }