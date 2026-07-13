import {
    getGoogleAiApiKey,
    getLlmProviderStatuses,
  } from "../../config/llmProviders";
  import type { LlmRequest, LlmResponse } from "./llmTypes";
  
  export async function runGoogleCompletion(
    request: LlmRequest,
    model: string
  ): Promise<LlmResponse> {
    const apiKey = getGoogleAiApiKey();
  
    if (!apiKey) {
      return {
        provider: "google",
        model,
        mode: request.preference?.mode || "auto",
        isMock: true,
        outputText:
          "[MOCK GEMINI] Google AI API key is not configured yet. This is a foundation response from the LLM provider abstraction.",
      };
    }
  
    const googleStatus = getLlmProviderStatuses().find(
      (providerStatus) => providerStatus.provider === "google"
    );
  
    return {
      provider: "google",
      model: googleStatus?.defaultModel || model,
      mode: request.preference?.mode || "auto",
      isMock: true,
      outputText:
        "[MOCK GEMINI] Google AI key detected. Real Gemini API call will be implemented in the next integration phase.",
    };
  }