import { resolveRuntimeProvider } from "./dynamicProviderRuntime";
import type { LlmRequest, LlmResponse } from "./llmTypes";
import { getProviderRuntimeAdapter } from "./adapters/providerAdapterRegistry";
import { resolveRuntimeProviderSecret } from "./adapters/providerRuntimeSecret";
import { createAdapterMockResponse } from "./adapters/llmAdapterTypes";

export async function runLlmCompletion(
  request: LlmRequest
): Promise<LlmResponse> {
  const resolved = await resolveRuntimeProvider(request);
  const { provider, model, mode } = resolved;

  const adapter = getProviderRuntimeAdapter(provider.type);
  const apiKey = await resolveRuntimeProviderSecret(provider);

  try {
    return await adapter.run({
      request,
      provider,
      model,
      mode,
      apiKey,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown provider adapter error";

    return createAdapterMockResponse(
      {
        request,
        provider,
        model,
        mode,
        apiKey,
      },
      `Provider adapter fallback: ${message}`
    );
  }
}