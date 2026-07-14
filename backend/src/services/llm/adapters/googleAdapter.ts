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

type GoogleGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GOOGLE_ALIAS_IDS = [
  "gemini-default",
  "gemini-fast",
  "gemini-deep",
  "gemini-creative",
];

function resolveGoogleRuntimeModel(model: string) {
  if (model === "gemini-fast") {
    return (
      process.env.GOOGLE_FAST_MODEL ||
      process.env.GOOGLE_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "gemini-deep") {
    return (
      process.env.GOOGLE_DEEP_MODEL ||
      process.env.GOOGLE_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "gemini-creative") {
    return (
      process.env.GOOGLE_CREATIVE_MODEL ||
      process.env.GOOGLE_RUNTIME_MODEL ||
      ""
    );
  }

  if (model === "gemini-default") {
    return process.env.GOOGLE_RUNTIME_MODEL || "";
  }

  return model;
}

function isAliasModel(model: string) {
  return GOOGLE_ALIAS_IDS.includes(model);
}

function extractGoogleText(response: GoogleGenerateContentResponse) {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

export const googleAdapter: ProviderRuntimeAdapter = {
  type: "google",

  async run(input) {
    if (!input.apiKey) {
      return createAdapterMockResponse(
        input,
        "Google AI API key is not configured"
      );
    }

    const runtimeModel = resolveGoogleRuntimeModel(input.model);

    if (!runtimeModel || isAliasModel(runtimeModel)) {
      return createAdapterMockResponse(
        input,
        `Google real model ID is not configured for alias "${input.model}". Set GOOGLE_RUNTIME_MODEL or use a real Gemini/Gemma model ID in the provider registry`
      );
    }

    const baseUrl =
      input.provider.baseUrl?.replace(/\/$/, "") ||
      "https://generativelanguage.googleapis.com";

    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
      runtimeModel
    )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

    const generationConfig = getRuntimeGenerationConfig(
      input.request.inputText,
      input.mode
    );

    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: buildGuardedSystemPrompt(input.request.systemPrompt),
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildGuardedUserPrompt(input.request.inputText),
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: generationConfig.maxOutputTokens,
            temperature: generationConfig.temperature,
          },
        }),
      });

      const data = (await response.json()) as GoogleGenerateContentResponse;

      if (!response.ok) {
        return createAdapterMockResponse(
          input,
          data.error?.message ||
          `Google Gemini/Gemma request failed with HTTP ${response.status}`
        );
      }

      const outputText = cleanRuntimeOutput(
        input.request.inputText,
        extractGoogleText(data)
      );

      if (!outputText) {
        return createAdapterMockResponse(
          input,
          "Google Gemini/Gemma response did not contain text output"
        );
      }

      return {
        provider: "google",
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
        error instanceof Error ? error.message : "Unknown Google runtime error";

      return createAdapterMockResponse(
        input,
        `Google runtime error: ${message}`
      );
    }
  },
};