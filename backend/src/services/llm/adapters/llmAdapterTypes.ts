import type {
    LlmModelMode,
    LlmProvider,
    LlmRequest,
    LlmResponse,
    RuntimeResolvedProvider,
  } from "../llmTypes";
  
  export type ProviderAdapterInput = {
    request: LlmRequest;
    provider: RuntimeResolvedProvider;
    model: string;
    mode: LlmModelMode;
    apiKey: string;
  };
  
  export type ProviderRuntimeAdapter = {
    type: Exclude<LlmProvider, "auto">;
    run: (input: ProviderAdapterInput) => Promise<LlmResponse>;
  };
  
  export function createAdapterMockResponse(
    input: ProviderAdapterInput,
    reason: string
  ): LlmResponse {
    const capabilityText =
      input.provider.capabilities.length > 0
        ? input.provider.capabilities.join(", ")
        : "no capabilities declared";
  
    return {
      provider: input.provider.type,
      providerId: input.provider.id,
      providerName: input.provider.name,
      providerType: input.provider.type,
      model: input.model,
      mode: input.mode,
      isMock: true,
      resolvedFrom: input.provider.source,
      outputText:
        `[MOCK ${input.provider.name}] ${reason}. ` +
        `Provider "${input.provider.name}" (${input.provider.type}) selected model "${input.model}" ` +
        `for agent "${input.request.agentName}". Capabilities: ${capabilityText}.`,
    };
  }
  
  export function getRuntimeTimeoutMs() {
    const value = Number(process.env.LLM_RUNTIME_TIMEOUT_MS || 60000);
  
    if (Number.isNaN(value) || value <= 0) {
      return 60000;
    }
  
    return value;
  }
  
  export async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = getRuntimeTimeoutMs()
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }