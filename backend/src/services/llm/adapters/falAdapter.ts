import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import { createAdapterMockResponse } from "./llmAdapterTypes";

export const falAdapter: ProviderRuntimeAdapter = {
  type: "fal",

  async run(input) {
    return createAdapterMockResponse(
      input,
      "fal.ai adapter is reserved for media generation workflows and is not used for chat completion yet"
    );
  },
};