export type LlmProviderName = "auto" | "anthropic" | "google";

export type DynamicProviderType =
  | "anthropic"
  | "google"
  | "openai-compatible"
  | "local"
  | "custom-http"
  | "fal";

export type LlmModelMode = "auto" | "fast" | "deep" | "creative";

export type LlmModelOption = {
  id: string;
  label: string;
  mode: LlmModelMode;
  provider: LlmProviderName;
};

export type DynamicProviderModelAlias = {
  id: string;
  label: string;
  mode?: LlmModelMode;
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

export type DynamicLlmProvider = {
  id: string;
  name: string;
  type: DynamicProviderType;
  baseUrl: string | null;
  configured: boolean;
  apiKeyPreview: string;
  defaultModel: string;
  enabled: boolean;
  capabilities: string[];
  modelAliases: DynamicProviderModelAlias[];
  createdAt: string;
  updatedAt: string;
};

export type DynamicProviderRegistryResponse = {
  providers: DynamicLlmProvider[];
};

export type CreateDynamicProviderPayload = {
  name: string;
  type: DynamicProviderType;
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  enabled?: boolean;
  capabilities?: string[];
  modelAliases?: DynamicProviderModelAlias[];
};

export type UpdateDynamicProviderPayload =
  Partial<CreateDynamicProviderPayload>;

export type TestDynamicProviderResponse = {
  ok: boolean;
  provider: DynamicLlmProvider;
  isMock: boolean;
  message: string;
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

    try {
      const parsed = JSON.parse(errorText) as { message?: string };
      throw new Error(parsed.message || errorText);
    } catch {
      throw new Error(
        errorText || `Request failed with status ${response.status}`
      );
    }
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

export async function fetchDynamicLlmProviders() {
  return requestJson<DynamicProviderRegistryResponse>("/api/llm/registry");
}

export async function createDynamicLlmProvider(
  payload: CreateDynamicProviderPayload
) {
  return requestJson<DynamicLlmProvider>("/api/llm/registry", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDynamicLlmProvider(
  providerId: string,
  payload: UpdateDynamicProviderPayload
) {
  return requestJson<DynamicLlmProvider>(`/api/llm/registry/${providerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDynamicLlmProvider(providerId: string) {
  return requestJson<{ deleted: boolean; id: string }>(
    `/api/llm/registry/${providerId}`,
    {
      method: "DELETE",
    }
  );
}

export async function testDynamicLlmProvider(providerId: string) {
  return requestJson<TestDynamicProviderResponse>(
    `/api/llm/registry/${providerId}/test`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}