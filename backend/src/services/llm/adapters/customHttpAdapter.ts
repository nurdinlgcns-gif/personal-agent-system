import type { ProviderRuntimeAdapter } from "./llmAdapterTypes";
import { createAdapterMockResponse } from "./llmAdapterTypes";

export const customHttpAdapter: ProviderRuntimeAdapter = {
  type: "custom-http",

  async run(input) {
    return createAdapterMockResponse(
      input,
      "custom-http adapter is registered, but request template support is not implemented yet"
    );
  },
};