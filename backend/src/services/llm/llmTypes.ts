export type LlmProvider = "auto" | "anthropic" | "google";

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
  provider?: LlmProvider;
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
  model: string;
  outputText: string;
  mode: LlmModelMode;
  isMock: boolean;
};