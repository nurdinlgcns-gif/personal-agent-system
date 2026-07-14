export type LlmProvider =
  | "auto"
  | "anthropic"
  | "google"
  | "openai-compatible"
  | "local"
  | "custom-http"
  | "fal";

export type LlmModelMode = "auto" | "fast" | "deep" | "creative";

export type LlmProviderStatus = {
  provider: LlmProvider;
  displayName: string;
  configured: boolean;
  defaultModel: string;
  availableModels: Array<{
    id: string;
    label: string;
    mode: LlmModelMode;
    provider: LlmProvider;
  }>;
};

export type LlmRuntimePreference = {
  provider?: LlmProvider | string;
  providerId?: string;
  model?: string;
  mode?: LlmModelMode;
};

export type LlmRequest = {
  agentName: string;
  systemPrompt: string;
  inputText: string;
  preference?: LlmRuntimePreference;
};

export type LlmResponse = {
  provider: LlmProvider;
  providerId?: string | null;
  providerName?: string;
  providerType?: string;
  model: string;
  outputText: string;
  mode: LlmModelMode;
  isMock: boolean;
  resolvedFrom?: "registry" | "built-in-fallback";
};

export type RuntimeResolvedProvider = {
  id: string | null;
  name: string;
  type: LlmProvider;
  baseUrl: string | null;
  configured: boolean;
  apiKeyPreview: string;
  defaultModel: string;
  enabled: boolean;
  capabilities: string[];
  modelAliases: Array<{
    id: string;
    label: string;
    mode?: LlmModelMode;
  }>;
  source: "registry" | "built-in-fallback";
};