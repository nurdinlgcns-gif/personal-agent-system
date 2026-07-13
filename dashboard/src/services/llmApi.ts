export type LlmProviderName = "auto" | "anthropic" | "google";

export type LlmModelMode = "auto" | "fast" | "deep" | "creative";

export type LlmModelOption = {
  id: string;
  label: string;
  mode: LlmModelMode;
  provider: LlmProviderName;
};

export type LlmProviderStatus = {
  provider: LlmProviderName;
  displayName: string;
  configured: boolean;
  defaultModel: string;
  availableModels: LlmModelOption[];
};

export type LlmProvidersResponse = {
  defaultProvider: LlmProviderName;
  defaultModel: string;
  providers: LlmProviderStatus[];
  secrets: {
    anthropicConfigured: boolean;
    googleConfigured: boolean;
    anthropicKeyPreview: string;
    googleKeyPreview: string;
  };
};

export type LlmPreviewRequest = {
  inputText: string;
  agentName: string;
  provider: LlmProviderName;
  model: string;
  mode?: LlmModelMode;
};

export type LlmPreviewResponse = {
  provider: LlmProviderName;
  model: string;
  outputText: string;
  mode: LlmModelMode;
  isMock: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

async function requestJson<TResponse>(
  endpoint: string,
  options?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<TResponse>;
}

export async function fetchLlmProviders() {
  return requestJson<LlmProvidersResponse>("/api/llm/providers");
}

export async function previewLlmProvider(payload: LlmPreviewRequest) {
  return requestJson<LlmPreviewResponse>("/api/llm/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}