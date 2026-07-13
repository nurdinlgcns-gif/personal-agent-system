import {
    getAnthropicApiKey,
    getLlmProviderStatuses,
  } from "../../config/llmProviders";
  import type { LlmRequest, LlmResponse } from "./llmTypes";
  
  export async function runAnthropicCompletion(
    request: LlmRequest,
    model: string
  ): Promise<LlmResponse> {
    const apiKey = getAnthropicApiKey();
  
    if (!apiKey) {
      return {
        provider: "anthropic",
        model,
        mode: request.preference?.mode || "auto",
        isMock: true,
        outputText:
          "[MOCK CLAUDE] Anthropic API key is not configured yet. This is a foundation response from the LLM provider abstraction.",
      };
    }
  
    const anthropicStatus = getLlmProviderStatuses().find(
      (providerStatus) => providerStatus.provider === "anthropic"
    );
  
    return {
      provider: "anthropic",
      model: anthropicStatus?.defaultModel || model,
      mode: request.preference?.mode || "auto",
      isMock: true,
      outputText:
        "[MOCK CLAUDE] Anthropic key detected. Real Claude API call will be implemented in the next integration phase.",
    };
  }