import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import {
  createAdapterMockResponse,
  fetchWithTimeout,
} from "./llmAdapterTypes";

type AnthropicMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

const ANTHROPIC_ALIAS_IDS = [
  "claude-default",
  "claude-fast",
  "claude-deep",
  "claude-creative",
];

function resolveAnthropicRuntimeModel(model: string) {
  if (model === "claude-fast") {
    return (
      process.env.ANTHROPIC_FAST_MODEL ||
      process.env.ANTHROPIC_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "claude-deep") {
    return (
      process.env.ANTHROPIC_DEEP_MODEL ||
      process.env.ANTHROPIC_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "claude-creative") {
    return (
      process.env.ANTHROPIC_CREATIVE_MODEL ||
      process.env.ANTHROPIC_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "claude-default") {
    return process.env.ANTHROPIC_RUNTIME_MODEL || "";
  }

  return model;
}

function isAliasModel(model: string) {
  return ANTHROPIC_ALIAS_IDS.includes(model);
}

function extractAnthropicText(response: AnthropicMessageResponse) {
  return (
    response.content
      ?.filter((item) => item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n")
      .trim() || ""
  );
}

export const anthropicAdapter: ProviderRuntimeAdapter = {
  type: "anthropic",

  async run(input) {
    if (!input.apiKey) {
      return createAdapterMockResponse(
        input,
        "Anthropic API key is not configured"
      );
    }

    const runtimeModel = resolveAnthropicRuntimeModel(input.model);

    if (!runtimeModel || isAliasModel(runtimeModel)) {
      return createAdapterMockResponse(
        input,
        `Anthropic real model ID is not configured for alias "${input.model}". Set ANTHROPIC_RUNTIME_MODEL or use a real Claude model ID in the provider registry`
      );
    }

    const baseUrl =
      input.provider.baseUrl?.replace(/\/$/, "") ||
      "https://api.anthropic.com";

    try {
      const response = await fetchWithTimeout(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": input.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: runtimeModel,
          max_tokens: 1200,
          system: input.request.systemPrompt,
          messages: [
            {
              role: "user",
              content: input.request.inputText,
            },
          ],
        }),
      });

      const data = (await response.json()) as AnthropicMessageResponse;

      if (!response.ok) {
        return createAdapterMockResponse(
          input,
          data.error?.message ||
            `Anthropic request failed with HTTP ${response.status}`
        );
      }

      const outputText = extractAnthropicText(data);

      if (!outputText) {
        return createAdapterMockResponse(
          input,
          "Anthropic response did not contain text output"
        );
      }

      return {
        provider: "anthropic",
        providerId: input.provider.id,
        providerName: input.provider.name,
        providerType: input.provider.type,
        model: runtimeModel,
        mode: input.mode,
        outputText,
        isMock: false,
        resolvedFrom: input.provider.source,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Anthropic error";

      return createAdapterMockResponse(
        input,
        `Anthropic runtime error: ${message}`
      );
    }
  },
};