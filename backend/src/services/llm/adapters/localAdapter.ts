import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import { openAiCompatibleAdapter } from "./openaiCompatibleAdapter";

export const localAdapter: ProviderRuntimeAdapter = {
  type: "local",

  async run(input) {
    return openAiCompatibleAdapter.run({
      ...input,
      provider: {
        ...input.provider,
        type: "openai-compatible",
      },
    });
  },
};