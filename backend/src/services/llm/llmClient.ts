import { runAnthropicCompletion } from "./anthropicClient";
import { resolveRuntimeProvider } from "./dynamicProviderRuntime";
import { runGoogleCompletion } from "./googleClient";
import type { LlmRequest, LlmResponse } from "./llmTypes";

function buildDynamicMockResponse(
  request: LlmRequest,
  resolved: Awaited<ReturnType<typeof resolveRuntimeProvider>>
): LlmResponse {
  const { provider, model, mode } = resolved;

  const capabilityText =
    provider.capabilities.length > 0
      ? provider.capabilities.join(", ")
      : "no capabilities declared";

  return {
    provider: provider.type,
    providerId: provider.id,
    providerName: provider.name,
    providerType: provider.type,
    model,
    mode,
    isMock: true,
    resolvedFrom: provider.source,
    outputText:
      `[MOCK ${provider.name}] Runtime provider resolver selected "${provider.name}" ` +
      `(${provider.type}) with model "${model}" for agent "${request.agentName}". ` +
      `Capabilities: ${capabilityText}. Real provider call will be implemented in the next runtime integration phase.`,
  };
}

export async function runLlmCompletion(
  request: LlmRequest
): Promise<LlmResponse> {
  const resolved = await resolveRuntimeProvider(request);
  const { provider, model } = resolved;

  if (provider.source === "registry") {
    return buildDynamicMockResponse(request, resolved);
  }

  if (provider.type === "google") {
    const result = await runGoogleCompletion(
      {
        ...request,
        preference: {
          ...request.preference,
          provider: provider.type,
          model,
          mode: resolved.mode,
        },
      },
      model
    );

    return {
      ...result,
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      resolvedFrom: provider.source,
    };
  }

  const result = await runAnthropicCompletion(
    {
      ...request,
      preference: {
        ...request.preference,
        provider: provider.type,
        model,
        mode: resolved.mode,
      },
    },
    model
  );

  return {
    ...result,
    providerId: provider.id,
    providerName: provider.name,
    providerType: provider.type,
    resolvedFrom: provider.source,
  };
}