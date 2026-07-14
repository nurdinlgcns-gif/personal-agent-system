import {
  buildGuardedSystemPrompt,
  buildGuardedUserPrompt,
  cleanRuntimeOutput,
  getRuntimeGenerationConfig,
} from "../runtimeOutputGuardrails";
import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import {
  createAdapterMockResponse,
  fetchWithTimeout,
} from "./llmAdapterTypes";

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

function extractOpenAiCompatibleText(response: OpenAiCompatibleResponse) {
  return (
    response.choices?.[0]?.message?.content ||
    response.choices?.[0]?.text ||
    ""
  ).trim();
}

export const openAiCompatibleAdapter: ProviderRuntimeAdapter = {
  type: "openai-compatible",

  async run(input) {
    if (!input.provider.baseUrl) {
      return createAdapterMockResponse(
        input,
        "OpenAI-compatible baseUrl is not configured"
      );
    }

    if (!input.model || input.model === "auto") {
      return createAdapterMockResponse(
        input,
        "OpenAI-compatible model is not configured"
      );
    }

    const baseUrl = input.provider.baseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (input.apiKey) {
      headers.Authorization = `Bearer ${input.apiKey}`;
    }

    const generationConfig = getRuntimeGenerationConfig(
      input.request.inputText,
      input.mode
    );

    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: input.model,
          messages: [
            {
              role: "system",
              content: buildGuardedSystemPrompt(input.request.systemPrompt),
            },
            {
              role: "user",
              content: buildGuardedUserPrompt(input.request.inputText),
            },
          ],
          max_tokens: generationConfig.maxOutputTokens,
          temperature: generationConfig.temperature,
        }),
      });

      const data = (await response.json()) as OpenAiCompatibleResponse;

      if (!response.ok) {
        return createAdapterMockResponse(
          input,
          data.error?.message ||
          `OpenAI-compatible request failed with HTTP ${response.status}`
        );
      }

      const outputText = cleanRuntimeOutput(
        input.request.inputText,
        extractOpenAiCompatibleText(data)
      );

      if (!outputText) {
        return createAdapterMockResponse(
          input,
          "OpenAI-compatible response did not contain text output"
        );
      }

      return {
        provider: "openai-compatible",
        providerId: input.provider.id,
        providerName: input.provider.name,
        providerType: input.provider.type,
        model: input.model,
        mode: input.mode,
        outputText,
        isMock: false,
        resolvedFrom: input.provider.source,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown OpenAI-compatible runtime error";

      return createAdapterMockResponse(
        input,
        `OpenAI-compatible runtime error: ${message}`
      );
    }
  },
};